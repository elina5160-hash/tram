import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient } from "@/lib/supabase"

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN || ""
  const password1 = process.env.ROBO_PASSWORD1 || ""
  if (!merchant || !password1) {
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

  const invId = body.invId && typeof body.invId === "number" ? body.invId : Date.now()
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
      Tax: it.tax || "vat0",
      PaymentMethod: it.paymentMethod || "full_prepayment",
      PaymentObject: it.paymentObject || "commodity",
    }))
  }

  const payload = toBase64Url(JSON.stringify(payloadJson))
  const compact = `${header}.${payload}`
  const key = `${merchant}:${password1}`
  const signature = crypto.createHmac("md5", key).update(compact, "utf8").digest("base64")
  const token = `"${compact}.${signature}"`

  const res = await fetch("https://services.robokassa.ru/InvoiceServiceWebApi/api/CreateInvoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: token,
  })

  const text = await res.text()
  let url = ""
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === "string") {
      url = parsed
    } else if (parsed && parsed.url) {
      url = parsed.url
    }
  } catch {
    const m = text.match(/https?:\/\/\S+/)
    url = m ? m[0] : ""
  }

  try {
    const client = getSupabaseClient()
    if (client) {
      await client.from("orders").insert({
        id: invId,
        total_amount: outSum,
        items: (body.invoiceItems || []).map((it) => ({ title: it.name, qty: it.quantity, price: it.cost })),
        customer_info: body.customerInfo || { email: body.email || "" },
        promo_code: body.promoCode,
        ref_code: body.refCode,
        status: "pending",
      })
    }
  } catch {}

  return NextResponse.json({ url, invId, raw: text })
}
