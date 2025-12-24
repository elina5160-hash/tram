import { NextResponse } from "next/server"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { getTinkoffCredentials, generateToken } from "@/lib/tinkoff"

const { TERMINAL_KEY, API_URL } = getTinkoffCredentials()

function sanitizeText(input: string | number) {
  return Array.from(String(input)).filter((ch) => !/\p{Extended_Pictographic}/u.test(ch) && ch !== "\u200D" && ch !== "\uFE0F").join("")
}

export async function POST(req: Request) {
  type ReceiptItemInput = {
    id?: number
    name?: string
    quantity?: number
    cost?: number
    tax?: string
    paymentMethod?: string
    paymentObject?: string
  }
  
  let body: {
    outSum?: number
    description?: string
    email?: string
    customerInfo?: any
    promoCode?: string
    discountAmount?: number
    refCode?: string
    items?: ReceiptItemInput[]
    invId?: number
  } = {}
  
  try {
    body = await req.json()
    console.log("Received Init Body:", JSON.stringify(body, null, 2))
  } catch (e) {
    console.error("Failed to parse Init body:", e)
  }

  const outSum = body.outSum
  if (!outSum || outSum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }
  
  const description = sanitizeText(body.description || "Оплата заказа")
  const email = body.email || ""
  // Use provided invId if valid number, else generate new one
  let invId = body.invId && typeof body.invId === "number" ? Math.floor(body.invId) : Math.floor(Date.now() / 1000)
  const orderId = String(invId) // Tinkoff uses string OrderId

  // Generate text format for items (for Supabase/Telegram)
  let itemsText = "Товары не указаны";
  let itemsBackup: { id?: number; name: string; quantity: number; price: number; sum: number }[] = [];
  
  if (body.items && Array.isArray(body.items)) {
      itemsText = body.items.map(it => 
          `- ${it.name || 'Товар'} x${it.quantity || 1} (${(it.cost || 0) * (it.quantity || 1)} руб.)`
      ).join('\n');
      
      itemsBackup = body.items.map(it => ({
          id: it.id,
          name: it.name || "Товар",
          quantity: it.quantity || 1,
          price: it.cost || 0,
          sum: (it.cost || 0) * (it.quantity || 1)
      }));
  }

  // Save order to Supabase
  let client = getServiceSupabaseClient()
  if (!client) {
    client = getSupabaseClient()
  }

  if (!client) {
      console.error("Supabase client not initialized")
      return NextResponse.json({ error: "Internal Configuration Error: DB connection failed" }, { status: 500 })
  }

  const currentTime = new Date().toISOString();
  const fullText = [
      `📦 ЗАКАЗ #${invId}`,
      `💰 Сумма: ${outSum} руб.`,
      `👤 Клиент: ${body.customerInfo?.name || 'Не указано'}`,
      `🆔 ID клиента: ${body.customerInfo?.client_id || 'Не указано'}`,
      `📧 Email: ${email || 'Не указано'}`,
      `📍 Адрес: ${body.customerInfo?.address || body.customerInfo?.cdek || 'Не указано'}`,
      `📝 Товары:`,
      itemsText
  ].join('\n');

  // Check if order exists (for retry payment)
  const { data: existingOrder, error: fetchError } = await client.from("orders").select("id").eq("id", invId).single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error("Failed to check existing order:", fetchError)
      // We can continue if check fails, but risky. Better to try insert.
  }

  if (!existingOrder) {
      console.log(`Inserting new order ${invId} into DB...`)
      const { error, data: insertedData } = await client.from("orders").insert({
        id: invId,
        total_amount: outSum,
        currency: "RUB",
        // description: description, // Column missing in DB
        items: itemsText, // Store as text for easy reading
        customer_info: {
           ...body.customerInfo,
           email,
           items_backup: itemsBackup, // Backup structured items
           description: description // Store description here since column is missing
        },
        promo_code: body.promoCode || "",
        ref_code: body.refCode || "",
        status: "pending", // Initial status
        created_at: currentTime,
        updated_at: currentTime,
      }).select().single()
      
      if (error) {
          console.error("Failed to save order to Supabase:", error)
          return NextResponse.json({ error: "Failed to create order in database", details: error }, { status: 500 })
      }
      console.log(`Order ${invId} inserted successfully. Verify:`, insertedData?.id)
  } else {
      console.log(`Order ${invId} already exists. Skipping insert.`)
  }

  // Init Tinkoff Payment
  const amountKopecks = Math.round(outSum * 100)
  
  // Determine base URL dynamically from request
  const baseUrl = "https://tram-navy.vercel.app" // HARDCODED for stability


  // Configure Receipt (Check FZ-54)
  const receiptItems = (body.items || []).map(it => ({
      Name: sanitizeText(it.name || "Товар").substring(0, 128),
      Price: Math.round((it.cost || 0) * 100),
      Quantity: it.quantity || 1,
      Amount: Math.round((it.cost || 0) * (it.quantity || 1) * 100),
      Tax: "none", // or "vat20", "vat10", etc.
      PaymentMethod: "full_prepayment",
      PaymentObject: "commodity"
  }))

  // Ensure total sum matches
  const receiptTotal = receiptItems.reduce((sum, item) => sum + item.Amount, 0)
  if (Math.abs(receiptTotal - amountKopecks) > 10) {
      // Fix rounding error by adjusting last item
      const diff = amountKopecks - receiptTotal
      if (receiptItems.length > 0) {
          receiptItems[receiptItems.length - 1].Amount += diff
      }
  }

  const receipt = {
      Email: email || "info@etra-shop.ru",
      Taxation: "usn_income", // Simplified tax system
      Items: receiptItems
  }

  const initParams: any = {
      TerminalKey: TERMINAL_KEY,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: description,
      SuccessURL: `${baseUrl}/pay/success`,
      FailURL: `${baseUrl}/pay/fail`,
      NotificationURL: `${baseUrl}/api/tinkoff/notification`,
      Language: "ru"
  }
  
  // Only add receipt if items are provided
  if (receiptItems.length > 0) {
      initParams.Receipt = receipt
  }

  // Generate Token
  initParams.Token = generateToken(initParams)

  console.log("Sending Init request to Tinkoff:", JSON.stringify(initParams, null, 2))

  try {
      const res = await fetch(`${API_URL}/Init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initParams)
      })

      if (!res.ok) {
          const text = await res.text()
          console.error("Tinkoff API error:", res.status, text)
          return NextResponse.json({ error: "Payment gateway error" }, { status: 502 })
      }

      const data = await res.json()
      console.log("Tinkoff Init response:", data)

      if (data.Success) {
          // Update order with PaymentId
          if (data.PaymentId) {
             const { error: updateError } = await client
                 .from("orders")
                 .update({ 
                     customer_info: { 
                         ...body.customerInfo,
                         email,
                         items_backup: itemsBackup,
                         description: description,
                         payment_id: data.PaymentId 
                     } 
                 })
                 .eq("id", invId)
             
             if (updateError) {
                 console.error("Failed to save PaymentId:", updateError)
             }
          }

          return NextResponse.json({ url: data.PaymentURL, invId })
      } else {
          return NextResponse.json({ error: data.Message, details: data.Details }, { status: 400 })
      }
  } catch (e) {
      console.error("Fetch error:", e)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
