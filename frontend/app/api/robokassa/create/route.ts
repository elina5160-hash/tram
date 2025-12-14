import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient } from "@/lib/supabase"

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN
  const password1 = process.env.ROBO_PASSWORD1
  if (!merchant || !password1) {
    return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
  }
  
  let body: { 
    outSum?: number; 
    description?: string; 
    email?: string; 
    customerInfo?: any;
    promoCode?: string; 
    refCode?: string;
    items?: any[] 
  } = {}
  
  try {
    body = await req.json()
  } catch {}
  
  const outSum = typeof body.outSum === "number" ? body.outSum : 0
  if (!outSum || outSum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }
  
  const description = body.description || "Оплата заказа"
  const email = body.email || ""
  const invId = Date.now()
  
  // Сохраняем заказ в Supabase (если настроены переменные окружения)
  const client = getSupabaseClient()
  const { error } = client ? await client.from("orders").insert({
    id: invId,
    total_amount: outSum,
    items: body.items || [],
    customer_info: body.customerInfo || { email },
    promo_code: body.promoCode,
    ref_code: body.refCode,
    status: 'pending'
  }) : { error: null }

  if (error) {
    console.error("Error creating order in Supabase:", error)
    // Можно вернуть ошибку, если критично
  }

  const out = outSum.toFixed(2)
  const signature = crypto.createHash("md5").update([merchant, out, invId, password1].join(":"), "utf8").digest("hex")
  
  const params = new URLSearchParams()
  params.set("MerchantLogin", merchant)
  params.set("OutSum", out)
  params.set("InvId", String(invId))
  params.set("Description", description)
  params.set("SignatureValue", signature)
  
  if (email) params.set("Email", email)
  if (body.promoCode) params.set("Shp_promo", body.promoCode.trim())
  if (body.refCode) params.set("Shp_ref", body.refCode.trim())
  if (process.env.ROBO_IS_TEST) params.set("isTest", "1")
  
  params.set("Culture", "ru")
  
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
  return NextResponse.json({ url, invId })
}
