import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"

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
      // 1. Insert into original schema (backward compatibility)
      await client.from("orders").insert({
        id: invId,
        total_amount: outSum,
        items: (body.invoiceItems || []).map((it) => ({ title: it.name, qty: it.quantity, price: it.cost })),
        customer_info: body.customerInfo || { email: body.email || "" },
        promo_code: body.promoCode,
        ref_code: body.refCode,
        status: "pending",
      })

      // 2. Insert/Update fields for new schema (Whalesync sync)
      // Note: This assumes the table 'orders' has been updated with these new columns.
      // If columns don't exist, this might fail or be ignored depending on Supabase settings.
      // We do an update here because the row was just created.
      const customer = body.customerInfo || {}
      const productsStr = (body.invoiceItems || [])
        .map((it) => `${it.name} x${it.quantity}`)
        .join(", ")
      
      const shippingData = {
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || body.email || "",
        cdek: customer.cdek || "",
        address: customer.address || ""
      }

      await client.from("orders").update({
        user_id: customer.client_id ? String(customer.client_id) : null,
        username: customer.username || null,
        first_name: customer.name || null,
        order_date: customer.order_time || new Date().toISOString(),
        product: productsStr,
        partner_promo: body.promoCode || null,
        status: "Создан",
        tracking_number: "",
        shipping_data: JSON.stringify(shippingData),
        comments: "",
        quantity: (body.invoiceItems || []).reduce((sum, it) => sum + (it.quantity || 1), 0),
        // Additional requested fields mapped to null/empty for now
        user_id_link: "https://t.me/gdzodzgozg_bot/app",
        username_link: customer.username ? `https://t.me/${customer.username}` : null,
        tracking_sent: false,
        categories: "",
        shipping_cost: 0,
        verification: "",
        ok: ""
      }).eq('id', invId)

      // Send Telegram notification
      // Reuse 'customer' from above or redefine if needed (commented out to avoid linter error)
      // const customer = body.customerInfo || {} 
      const itemsList = (body.invoiceItems || [])
        .map((it) => `- ${it.name} x${it.quantity} (${it.cost} руб.)`)
        .join("\n")

      const msg = `
📦 <b>Новый заказ #${invId}</b>
💰 Сумма: <b>${outSum} руб.</b>
👤 Клиент: ${customer.name || "Не указан"}
📞 Телефон: ${customer.phone || "Не указан"}
📧 Email: ${customer.email || body.email || "Не указан"}
📍 Доставка: ${customer.cdek ? `СДЭК: ${customer.cdek}` : customer.address || "Не указан"}
${body.promoCode ? `🎫 Промокод: ${body.promoCode}` : ""}

🛒 <b>Товары:</b>
${itemsList}
      `.trim()

      // Send asynchronously without waiting
      sendTelegramMessage(msg).catch(e => console.error("BG Telegram send error", e))
    }
  } catch {}

  return NextResponse.json({ url, invId, raw: text })
}
