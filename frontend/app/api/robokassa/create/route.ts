import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN?.trim()
  const password1Raw = process.env.ROBO_PASSWORD1?.trim()
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST?.trim()

  const password1ToUse = isTest ? password1Test : password1Raw

  if (!merchant || !password1ToUse) {
    return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
  }
  
  let body: { 
    outSum?: number; 
    description?: string; 
    email?: string; 
    customerInfo?: any;
    promoCode?: string; 
    refCode?: string;
    items?: any[];
    invId?: number;
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
  // Use provided invId if valid number, else generate new one
  const invId = body.invId && typeof body.invId === "number" ? body.invId : Math.floor(Date.now() / 1000)
  
  // Сохраняем заказ в Supabase (если настроены переменные окружения)
  // Используем Service Role Client для обхода RLS
  const client = getServiceSupabaseClient()
  if (client) {
    const { error } = await client.from("orders").insert({
      id: invId,
      total_amount: outSum,
      items: body.items || [],
      customer_info: body.customerInfo || { email },
      promo_code: body.promoCode,
      ref_code: body.refCode,
      status: 'pending'
    })
    
    if (error) {
      console.error("Error creating order in Supabase:", error)
    }
  }

  const out = outSum.toFixed(2)

  const shp: Record<string, string> = {}
  if (body.promoCode) shp.Shp_promo = body.promoCode.trim()
  if (body.refCode) shp.Shp_ref = body.refCode.trim()

  const sortedKeys = Object.keys(shp).sort()
  const shpString = sortedKeys.map((k) => `${k}=${shp[k]}`).join(":")

  const base = [merchant, out, String(invId), password1ToUse].join(":")
  const signatureBase = shpString ? `${base}:${shpString}` : base
  const signature = crypto.createHash("md5").update(signatureBase, "utf8").digest("hex")
  
  console.log(`[Robokassa] Base: ${signatureBase}`)
  console.log(`[Robokassa] Signature: ${signature}`)

  const params = new URLSearchParams()
  params.set("MerchantLogin", merchant)
  params.set("OutSum", out)
  params.set("InvId", String(invId))
  params.set("Description", description)
  params.set("SignatureValue", signature)
  
  if (email) params.set("Email", email)
  sortedKeys.forEach((k) => params.set(k, shp[k]))
  if (isTest) params.set("IsTest", "1")
  
  params.set("Culture", "ru")
  
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
  return NextResponse.json({ url, invId })
}
