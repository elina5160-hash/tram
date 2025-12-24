import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"

// Credentials from Environment Variables
// Hardcoded for Vercel production to ensure correct values are used
const TERMINAL_KEY = "1765992881356" 
const PASSWORD = "ejlk$s_nR!5rZTPR"
const API_URL = "https://securepay.tinkoff.ru/v2"

function sanitizeText(input: string | number) {
  return Array.from(String(input)).filter((ch) => !/\p{Extended_Pictographic}/u.test(ch) && ch !== "\u200D" && ch !== "\uFE0F").join("")
}

function generateToken(params: Record<string, any>) {
    // Correct logic per T-Bank support: Password should be treated as a parameter "Password" and sorted alphabetically
    const paramsWithPwd: Record<string, any> = { ...params, Password: PASSWORD }
    const keys = Object.keys(paramsWithPwd).filter(k => k !== "Token" && k !== "Receipt" && k !== "DATA").sort()
    let str = ""
    for (const k of keys) {
        if (paramsWithPwd[k] !== undefined && paramsWithPwd[k] !== null && paramsWithPwd[k] !== "") {
            str += paramsWithPwd[k]
        }
    }
    const tokenInput = str
    return crypto.createHash("sha256").update(tokenInput).digest("hex")
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
  } catch {}

  const outSum = body.outSum
  if (!outSum || outSum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }
  
  const description = sanitizeText(body.description || "Оплата заказа")
  const email = body.email || ""
  // Use provided invId if valid number, else generate new one
  let invId = body.invId && typeof body.invId === "number" ? body.invId : Math.floor(Date.now() / 1000)
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

  if (client) {
    const currentTime = new Date().toISOString();
    const fullText = [
        `📦 ЗАКАЗ #${invId}`,
        `💰 Сумма: ${outSum} руб.`,
        `👤 Клиент: ${body.customerInfo?.name || 'Не указано'}`,
        `🆔 ID клиента: ${body.customerInfo?.client_id || 'Не указано'}`,
        `📧 Email: ${email || 'Не указано'}`,
        `📍 Адрес: ${body.customerInfo?.address || body.customerInfo?.cdek || 'Не указано'}`,
        ``,
        `🛒 Товары:`,
        itemsText,
        ``,
        `🎁 Конкурс:`,
        `Начислено билетов: 0 (ожидает оплаты)`
    ].join('\n');

    const { error } = await client.from("orders").insert({
      id: invId,
      total_amount: outSum,
      items: fullText,
      customer_info: { 
        ...(body.customerInfo || { email }),
        items_backup: itemsBackup,
        discount_amount: body.discountAmount || 0
      },
      promo_code: body.promoCode,
      ref_code: body.refCode,
      status: 'pending',
      updated_at: currentTime
    })
    if (error) {
      console.error("Error creating pending order in Supabase:", error)
    }
  }

  // Prepare Tinkoff Init Request
  const amountKopecks = Math.round(outSum * 100)
  
  const initParams: any = {
      TerminalKey: TERMINAL_KEY,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: description,
      // SuccessURL: `https://.../pay/confirm`, // We can let frontend handle this via URL from response, but Tinkoff might redirect
      // FailURL: `https://.../pay/fail`
      Language: "ru"
  }

  // Add Receipt if items exist
  if (body.items && body.items.length > 0) {
      let receiptItems = body.items.map(it => ({
          Name: sanitizeText(it.name || "Товар").substring(0, 128), // Tinkoff limit
          Price: Math.round((it.cost || 0) * 100),
          Quantity: it.quantity || 1,
          Amount: Math.round(((it.cost || 0) * (it.quantity || 1)) * 100),
          Tax: "none", // or vat0, vat10, vat20. "none" for USN usually.
          PaymentMethod: "full_prepayment",
          PaymentObject: "commodity"
      }))

      // Balance check: Sum of items vs Order Amount
      const currentSum = receiptItems.reduce((acc, item) => acc + item.Amount, 0)
      const diff = amountKopecks - currentSum

      if (diff > 0) {
          // Add Delivery/Shipping item
          receiptItems.push({
              Name: "Доставка",
              Price: diff,
              Quantity: 1,
              Amount: diff,
              Tax: "none",
              PaymentMethod: "full_prepayment",
              PaymentObject: "service"
          })
      } else if (diff < 0) {
          // Handle Discount (simple approach: reduce from first item that can absorb it)
          // Note: This is a basic implementation. For complex cases, proportional distribution is needed.
          let remainingDiff = -diff // positive value to subtract
          
          for (const item of receiptItems) {
              if (remainingDiff <= 0) break;
              
              if (item.Amount > remainingDiff) {
                  item.Amount -= remainingDiff
                  // Recalculate Price. Ideally should handle Quantity > 1 splitting, 
                  // but for now we assume Quantity 1 or accept slight price deviation if Tinkoff allows.
                  // Tinkoff validates Amount = Price * Quantity. 
                  // So we must adjust Price.
                  item.Price = Math.floor(item.Amount / item.Quantity)
                  // Adjust Amount to match strict Price * Quantity
                  const newAmount = item.Price * item.Quantity
                  const dust = item.Amount - newAmount // remainder
                  item.Amount = newAmount
                  remainingDiff = dust // passed to next item or ignored if small
              }
          }
      }
      
      initParams.Receipt = {
          Email: email || "no-reply@example.com",
          Phone: body.customerInfo?.phone || undefined,
          Taxation: "usn_income", // Simplified or Patent. Adjust as needed.
          FfdVersion: "1.05",
          Items: receiptItems
      }
  }

  // Generate Token
  initParams.Token = generateToken(initParams)

  console.log(`🔌 Tinkoff Init: Connecting to ${API_URL}/Init with TerminalKey=${TERMINAL_KEY}`)

  try {
      const res = await fetch(`${API_URL}/Init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initParams)
      })
      
      const text = await res.text()
      // console.log("🔌 Tinkoff Response Raw:", text.substring(0, 500))

      let data: any
      try {
        data = JSON.parse(text)
      } catch (err) {
        console.error("❌ Tinkoff Response is not JSON:", text.substring(0, 200))
        return NextResponse.json({ 
            error: "Invalid response from bank", 
            details: `Bank returned non-JSON (Status ${res.status}): ${text.substring(0, 100)}`,
            debug_url: API_URL
        }, { status: 502 })
      }
      
      if (data.Success) {
          return NextResponse.json({ url: data.PaymentURL, invId })
      } else {
          console.error("Tinkoff Init Error:", data)
          return NextResponse.json({ 
            error: data.Message || "Payment failed", 
            details: data.Details || "No details provided",
            debug: { message: data.Message, details: data.Details, errorCode: data.ErrorCode }
          }, { status: 400 })
      }
  } catch (e: any) {
      console.error("Tinkoff Init Failed:", e)
      return NextResponse.json({ 
        error: "Payment initialization failed", 
        details: e.message || String(e)
      }, { status: 500 })
  }
}
