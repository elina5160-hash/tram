import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN || ""
  const password1 = process.env.ROBO_PASSWORD1 || ""
  if (!merchant || !password1) {
    console.error("Missing Robokassa credentials:", { 
      ROBO_MERCHANT_LOGIN: merchant ? "Set" : "Missing", 
      ROBO_PASSWORD1: password1 ? "Set" : "Missing" 
    })
    return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
  }

  let body: {
    outSum?: number
    description?: string
    email?: string
    customerInfo?: any
    promoCode?: string
    refCode?: string
    invoiceItems?: { name: string; quantity: number; cost: number; tax?: string; paymentMethod?: string; paymentObject?: string }[]
    invId?: number
  } = {}

  try {
    body = await req.json()
  } catch {}

  const outSum = typeof body.outSum === "number" ? body.outSum : 0
  if (!outSum || outSum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }

  const invId = body.invId && typeof body.invId === "number" ? body.invId : Math.floor(Date.now() / 1000)
  const description = body.description || "Оплата заказа"

  // Сохраняем заказ в Supabase
  // Используем обычный клиент (getSupabaseClient), так как RLS позволяет запись, 
  // а Service Key может отсутствовать на Vercel.
  let client = getServiceSupabaseClient()
  if (!client) {
    client = getSupabaseClient()
  }
  
  if (client) {
    // Получаем текущее время в формате HH:mm:ss для поля updated_at (тип time)
    const currentTime = new Date().toISOString().split('T')[1].split('.')[0];
    
    // Сохраняем заказ в таблицу pending_orders
    // Если pending_orders нет, используем fallback на orders
    try {
      const { error } = await client.from("pending_orders").insert({
        id: invId,
        total_amount: outSum,
        items: body.invoiceItems || [],
        customer_info: body.customerInfo || { email: body.email },
        promo_code: body.promoCode,
        ref_code: body.refCode,
        status: 'pending',
        updated_at: currentTime
      })

      if (error) throw error
    } catch (e) {
      console.error("Error saving to pending_orders, falling back to orders:", e)
      const { error: fallbackError } = await client.from("orders").insert({
        id: invId,
        total_amount: outSum,
        items: body.invoiceItems || [],
        customer_info: body.customerInfo || { email: body.email },
        promo_code: body.promoCode,
        ref_code: body.refCode,
        status: 'pending',
        updated_at: currentTime
      })

      if (fallbackError) {
        console.error("Error creating order in fallback (orders):", fallbackError)
        return NextResponse.json({ error: "Ошибка сохранения заказа. Попробуйте позже." }, { status: 500 })
      }
    }
  } else {
      console.error("Supabase client not initialized")
      return NextResponse.json({ error: "Ошибка подключения к базе данных" }, { status: 500 })
  }

  const headerJson = { typ: "JWT", alg: "MD5" }
  const header = toBase64Url(JSON.stringify(headerJson))

  type InvoiceItemPayload = {
    Name: string
    Quantity: number
    Cost: number
    Tax: string
    PaymentMethod: string
    PaymentObject: string
  }

  type CreatePayload = {
    MerchantLogin: string
    InvoiceType: "OneTime" | "Reusable"
    Culture: "ru" | "en"
    InvId: number
    OutSum: number
    Description: string
    MerchantComments?: string
    InvoiceItems?: InvoiceItemPayload[]
  }

  const payloadJson: CreatePayload = {
    MerchantLogin: merchant,
    InvoiceType: "OneTime",
    Culture: "ru",
    InvId: invId,
    OutSum: outSum,
    Description: description,
    MerchantComments: body.email ? body.email : "",
  }

  if (body.invoiceItems && Array.isArray(body.invoiceItems) && body.invoiceItems.length > 0) {
    let items = body.invoiceItems.map((it) => ({
      Name: it.name,
      Quantity: it.quantity,
      Cost: it.cost,
      Tax: it.tax || "none",
      PaymentMethod: it.paymentMethod || "full_prepayment",
      PaymentObject: it.paymentObject || "commodity",
    }))

    // Normalization logic for InvoiceItems
    const totalItemsSum = items.reduce((acc, it) => acc + (it.Cost * it.Quantity), 0)
    
    if (Math.abs(totalItemsSum - outSum) > 0.01) {
         const coefficient = outSum / totalItemsSum
         let currentSum = 0
         
         items = items.map((it, index) => {
            if (index === items.length - 1) {
              const newItemSum = Number((outSum - currentSum).toFixed(2))
              // Force Quantity 1 to ensure exact match if division is not clean
              return { ...it, Quantity: 1, Cost: newItemSum }
            } else {
              const newItemSum = Number((it.Cost * it.Quantity * coefficient).toFixed(2))
              currentSum += newItemSum
              // Force Quantity 1 to ensure exact match
              return { ...it, Quantity: 1, Cost: newItemSum }
            }
         })
    }
    
    payloadJson.InvoiceItems = items
  }

  const payload = toBase64Url(JSON.stringify(payloadJson))
  const compact = `${header}.${payload}`
  const key = crypto.createHash("md5").update(`${merchant}:${password1}`).digest("hex")
  const signature = crypto.createHmac("md5", key).update(compact, "utf8").digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  const token = `${compact}.${signature}`
 
  const res = await fetch("https://services.robokassa.ru/InvoiceServiceWebApi/api/CreateInvoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `"${token}"`,
  })

  const text = await res.text()
  let url = ""
  try {
    const parsed = JSON.parse(text)
    if (parsed.invoiceUrl) url = parsed.invoiceUrl
    else if (parsed.url) url = parsed.url
    
    // Log the raw response if error
    if (!res.ok) {
        console.error("Robokassa Invoice API Error:", parsed)
        return NextResponse.json({ raw: text, invId }, { status: res.status })
    }
    
    return NextResponse.json({ url, invId, raw: text }) // Return raw for debugging
  } catch (e) {
    console.error("Robokassa Invoice API Parse Error:", text)
    return NextResponse.json({ error: "Invalid response from Robokassa", raw: text }, { status: 500 })
  }
}
