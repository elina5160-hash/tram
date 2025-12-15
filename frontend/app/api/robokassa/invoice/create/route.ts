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
  const key = `${merchant}:${password1}`
  const signature = crypto.createHmac("md5", key).update(compact, "utf8").digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  const token = `${compact}.${signature}`

  // Try standard JSON object wrapping again, but with correct content type?
  // Or try raw string?
  // Actually, let's try just sending the object WITHOUT JWT, as I suspected in previous thought?
  // No, the previous thought result was "Could not convert to String", so it WANTS a string.
  
  // So I will send the JWT token.
  // I will try wrapping it in quotes as a raw string body, ensuring Content-Type is application/json.
  // BUT I will also try to fix the "Invalid start" issue.
  // Maybe "Invalid start" was because I used MD5 before? Unlikely.
  
  // Let's try sending as simple object: { request: token }
  // And if that fails, I'll log the error.
  
  // Wait, if "The JSON value could not be converted to System.String" happens with { request: token },
  // it means the API expects the ROOT to be a string.
  // So I MUST send a string.
  
  // So I will send `JSON.stringify(token)`.
  // And if I get "Invalid start", I will assume it's because the token format is wrong?
  // No, "Invalid start" usually means JSON parsing error.
  
  // Let's try sending it as `text/json`?
  
  const res = await fetch("https://services.robokassa.ru/InvoiceServiceWebApi/api/CreateInvoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(token),
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
