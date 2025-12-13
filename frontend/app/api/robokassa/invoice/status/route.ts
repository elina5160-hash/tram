import { NextResponse } from "next/server"
import crypto from "node:crypto"

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

type StatusRequest = {
  CurrentPage?: number
  PageSize?: number
  InvoiceStatuses?: string[]
  Keywords?: string
  DateFrom?: string
  DateTo?: string
  IsAscending?: boolean
  InvoiceTypes?: string[]
  PaymentAliases?: string[]
  SumFrom?: number
  SumTo?: number
}

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN || ""
  const password1 = process.env.ROBO_PASSWORD1 || ""
  if (!merchant || !password1) {
    return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
  }

  let body: StatusRequest = {}
  try { body = await req.json() } catch {}

  type StatusPayload = {
    MerchantLogin: string
    CurrentPage: number
    PageSize: number
    InvoiceStatuses?: string[]
    Keywords?: string
    DateFrom?: string
    DateTo?: string
    IsAscending?: boolean
    InvoiceTypes?: string[]
    PaymentAliases?: string[]
    SumFrom?: number
    SumTo?: number
  }

  const payloadJson: StatusPayload = {
    MerchantLogin: merchant,
    CurrentPage: body.CurrentPage || 1,
    PageSize: body.PageSize || 10,
  }

  if (body.InvoiceStatuses) payloadJson.InvoiceStatuses = body.InvoiceStatuses
  if (body.Keywords) payloadJson.Keywords = body.Keywords
  if (body.DateFrom) payloadJson.DateFrom = body.DateFrom
  if (body.DateTo) payloadJson.DateTo = body.DateTo
  if (typeof body.IsAscending !== "undefined") payloadJson.IsAscending = !!body.IsAscending
  if (body.InvoiceTypes) payloadJson.InvoiceTypes = body.InvoiceTypes
  if (body.PaymentAliases) payloadJson.PaymentAliases = body.PaymentAliases
  if (typeof body.SumFrom !== "undefined") payloadJson.SumFrom = body.SumFrom
  if (typeof body.SumTo !== "undefined") payloadJson.SumTo = body.SumTo

  const header = toBase64Url(JSON.stringify({ typ: "JWT", alg: "MD5" }))
  const payload = toBase64Url(JSON.stringify(payloadJson))
  const compact = `${header}.${payload}`
  const key = `${merchant}:${password1}`
  const signature = crypto.createHmac("md5", key).update(compact, "utf8").digest("base64")
  const token = `"${compact}.${signature}"`

  const res = await fetch("https://services.robokassa.ru/InvoiceServiceWebApi/api/GetInvoiceInformationList", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: token,
  })
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ raw: text })
  }
}
