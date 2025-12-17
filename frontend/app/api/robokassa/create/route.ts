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
    customerInfo?: unknown
    promoCode?: string
    refCode?: string
    items?: ReceiptItemInput[]
    invId?: number
  } = {}
  
  try {
    body = await req.json()
  } catch {}
  
  const outSum = typeof body.outSum === "number" ? body.outSum : 0
  if (!outSum || outSum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }
  
  const description = sanitizeText(body.description || "Оплата заказа")
  const email = body.email || ""
  // Use provided invId if valid number, else generate new one
  const invId = body.invId && typeof body.invId === "number" ? body.invId : Math.floor(Date.now() / 1000)
  
  // Сохраняем заказ в Supabase (если настроены переменные окружения)
  // Пытаемся использовать Service Client, если нет - обычный
  let client = getServiceSupabaseClient()
  if (!client) {
    client = getSupabaseClient()
  }

  if (client) {
    const currentTime = new Date().toISOString();
    const { error } = await client.from("pending_orders").insert({
      id: invId,
      total_amount: outSum,
      items: body.items || [],
      customer_info: body.customerInfo || { email },
      promo_code: body.promoCode,
      ref_code: body.refCode,
      status: 'pending',
      updated_at: currentTime
    })
    if (error) {
      console.error("Error creating pending order in Supabase:", error)
    }
  }

  const out = outSum.toFixed(2)

  const shp: Record<string, string> = {}
  if (body.promoCode) shp.Shp_promo = body.promoCode.trim()
  if (body.refCode) shp.Shp_ref = body.refCode.trim()
  try {
    const ci = body.customerInfo as any
    const name = typeof ci?.name === "string" ? ci.name.trim() : ""
    const phone = typeof ci?.phone === "string" ? ci.phone.trim() : ""
    const address = typeof ci?.address === "string" ? ci.address.trim() : ""
    const cdek = typeof ci?.cdek === "string" ? ci.cdek.trim() : ""
    const clientId = ci?.client_id ? String(ci.client_id) : ""
    if (name) shp.Shp_name = sanitizeText(name)
    if (phone) shp.Shp_phone = phone
    if (address) shp.Shp_address = sanitizeText(address)
    if (!address && cdek) shp.Shp_cdek = sanitizeText(cdek)
    if (email) shp.Shp_email = email
    if (clientId) shp.Shp_client = clientId
  } catch {}

  const sortedKeys = Object.keys(shp).sort()
  const shpString = sortedKeys.map((k) => `${k}=${shp[k]}`).join(":")

  let receiptEncodedOnce = ""
  let receiptEncodedTwice = ""
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
      try {
        const itemsSimple = JSON.stringify(receiptItems.map((x) => ({ n: x.name, q: x.quantity, s: x.sum })))
        shp.Shp_items = encodeURIComponent(itemsSimple)
      } catch {}
    } catch {}
  }

  const baseParts = [merchant, out, String(invId)]
  if (receiptEncodedOnce) baseParts.push(receiptEncodedOnce)
  baseParts.push(password1ToUse as string)
  let signatureBase = baseParts.join(":")
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
  if (receiptEncodedTwice) params.set("Receipt", receiptEncodedTwice)
  
  if (email) params.set("Email", email)
  sortedKeys.forEach((k) => params.set(k, shp[k]))
  if (isTest) params.set("IsTest", "1")
  
  params.set("Culture", "ru")
  
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
  return NextResponse.json({ url, invId })
}
