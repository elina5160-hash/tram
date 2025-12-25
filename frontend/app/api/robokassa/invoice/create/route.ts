import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

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
    customerInfo?: unknown
    promoCode?: string
    discountAmount?: number
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
    const currentTime = new Date().toISOString();
    
    // Add timeout for DB operations to avoid blocking the UI
    const dbPromise = client.from("orders").insert({
      id: invId,
      total_amount: outSum,
      items: body.invoiceItems || [],
      customer_info: { ...(body.customerInfo as object || { email: body.email }), discount_amount: body.discountAmount || 0 },
      promo_code: body.promoCode,
      ref_code: body.refCode,
      status: 'pending',
      updated_at: currentTime
    });
    
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("DB_TIMEOUT")), 3000));
    
    try {
        const result: any = await Promise.race([dbPromise, timeoutPromise]);
        if (result.error) {
            console.error("Error creating pending order in Supabase:", result.error)
        }
    } catch (e) {
        console.error("Supabase insert timed out or failed:", e)
        // Continue to create invoice even if DB fails, to not block payment.
        // Note: Result handler might fail to find order if this happens.
        // Ideally we should pass data to Robokassa, but API is limited.
    }
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
    payloadJson.InvoiceItems = body.invoiceItems.map((it) => ({
      Name: it.name,
      Quantity: it.quantity,
      Cost: it.cost,
      Tax: it.tax || "none",
      PaymentMethod: it.paymentMethod || "full_prepayment",
      PaymentObject: it.paymentObject || "commodity",
    }))
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
