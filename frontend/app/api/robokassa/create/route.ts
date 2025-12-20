import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

function sanitizeText(input: string) {
  return Array.from(input).filter((ch) => !/\p{Extended_Pictographic}/u.test(ch) && ch !== "\u200D" && ch !== "\uFE0F").join("")
}

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN?.trim()
  const password1Raw = process.env.ROBO_PASSWORD1?.trim()
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST?.trim()

  const password1ToUse = isTest ? password1Test : password1Raw

  if (!merchant || !password1ToUse) {
    return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
  }
  
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
  
  // Сохраняем заказ в Supabase (если настроены переменные окружения)
  let client = getServiceSupabaseClient()
  if (!client) {
    client = getSupabaseClient()
  }

  if (client) {
    const currentTime = new Date().toISOString();
    
    // Generate text format for items to match standard order format
    let itemsText = "Товары не указаны";
    let itemsBackup: { id?: number; name: string; quantity: number; price: number; sum: number }[] = [];
    
    if (body.items && Array.isArray(body.items)) {
        itemsText = body.items.map(it => 
            `- ${it.name || 'Товар'} x${it.quantity || 1} (${(it.cost || 0) * (it.quantity || 1)} руб.)`
        ).join('\n');
        
        // Prepare backup with IDs for repeat functionality
        itemsBackup = body.items.map(it => ({
            id: it.id,
            name: it.name || "Товар",
            quantity: it.quantity || 1,
            price: it.cost || 0,
            sum: (it.cost || 0) * (it.quantity || 1)
        }));
    }

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
        items_backup: itemsBackup 
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

  let receiptEncodedOnce = ""
  let receiptEncodedTwice = ""
  const shp: Record<string, string> = {}

  if (body.items && body.items.length > 0) {
    try {
      const receiptItems = body.items.map((it: ReceiptItemInput) => ({
        name: sanitizeText(it.name || "Товар"),
        quantity: it.quantity || 1,
        sum: (it.cost || 0) * (it.quantity || 1),
        tax: it.tax || "none",
        payment_method: it.paymentMethod || "full_prepayment",
        payment_object: it.paymentObject || "commodity"
      }))
      const receiptJson = JSON.stringify({ items: receiptItems })
      receiptEncodedOnce = encodeURIComponent(receiptJson)
      receiptEncodedTwice = encodeURIComponent(receiptEncodedOnce)
      // Note: Shp_items removed to avoid signature issues. 
      // Items are restored from Supabase in result/route.ts
    } catch {}
  }

  const out = outSum.toString()
  const baseParts = [merchant, out, String(invId)]
  // Receipt must be included in the signature for Merchant/Index.aspx
  // and it must be the double-encoded version (as per user instruction)
  if (receiptEncodedTwice) baseParts.push(receiptEncodedTwice)
  baseParts.push(password1ToUse as string)
  let signatureBase = baseParts.join(":")
  
  const sortedKeys = Object.keys(shp).sort()
  const shpString = sortedKeys.map(k => `${k}=${shp[k]}`).join(':')

  if (shpString) signatureBase = `${signatureBase}:${shpString}`
  const signature = crypto.createHash("md5").update(signatureBase, "utf8").digest("hex")
  
  console.log(`[Robokassa] Base: ${signatureBase}`)
  console.log(`[Robokassa] Signature: ${signature}`)

  const params = new URLSearchParams()
  params.set("MerchantLogin", merchant)
  params.set("OutSum", out)
  params.set("InvId", String(invId))
  params.set("Description", description)
  params.set("SignatureValue", signature)
  if (receiptEncodedTwice) params.set("Receipt", receiptEncodedOnce)
  
  if (email) params.set("Email", email)
  sortedKeys.forEach((k) => params.set(k, shp[k]))
  if (isTest) params.set("IsTest", "1")
  
  params.set("Culture", "ru")
  
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
  return NextResponse.json({ url, invId })
}
