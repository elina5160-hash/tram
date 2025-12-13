import { NextResponse } from "next/server"
import crypto from "node:crypto"

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN || ""
  const password1 = process.env.ROBO_PASSWORD1 || ""
  if (!merchant || !password1) {
    return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
  }

  let body: { invId?: number } = {}
  try { body = await req.json() } catch {}

  const invId = body.invId && typeof body.invId === "number" ? body.invId : 0
  if (!invId) {
    return NextResponse.json({ error: "Invalid invId" }, { status: 400 })
  }

  const header = toBase64Url(JSON.stringify({ typ: "JWT", alg: "MD5" }))
  const payload = toBase64Url(JSON.stringify({ MerchantLogin: merchant, InvId: invId }))
  const compact = `${header}.${payload}`
  const key = `${merchant}:${password1}`
  const signature = crypto.createHmac("md5", key).update(compact, "utf8").digest("base64")
  const token = `"${compact}.${signature}"`

  const res = await fetch("https://services.robokassa.ru/InvoiceServiceWebApi/api/DeactivateInvoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: token,
  })
  const text = await res.text()
  return NextResponse.json({ raw: text })
}

