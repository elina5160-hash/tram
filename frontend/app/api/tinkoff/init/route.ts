import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"

// Credentials from Environment Variables
const TERMINAL_KEY = process.env.TINKOFF_TERMINAL_KEY
const PASSWORD = process.env.TINKOFF_PASSWORD
const API_URL = process.env.TINKOFF_API_URL || "https://securepay.tinkoff.ru/v2"

function sanitizeText(input: string | number) {
  return Array.from(String(input)).filter((ch) => !/\p{Extended_Pictographic}/u.test(ch) && ch !== "\u200D" && ch !== "\uFE0F").join("")
}

function generateToken(params: Record<string, any>) {
    const keys = Object.keys(params).filter(k => k !== "Token" && k !== "Receipt" && k !== "DATA").sort()
    let str = ""
    for (const k of keys) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
            str += params[k]
        }
    }
    str += PASSWORD
    return crypto.createHash("sha256").update(str).digest("hex")
}

export async function POST(req: Request) {
  type ReceiptItemInput = {
    id?: number
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
    customerInfo?: any
    promoCode?: string
    discountAmount?: number
    refCode?: string
    items?: ReceiptItemInput[]
    invId?: number
  } = {}
  
  try {
    body = await req.json()
  } catch {}

  const outSum = body.outSum
  if (!outSum || outSum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }
  
  const description = sanitizeText(body.description || "Оплата заказа")
  const email = body.email || ""
  // Use provided invId if valid number, else generate new one
  let invId = body.invId && typeof body.invId === "number" ? body.invId : Math.floor(Date.now() / 1000)
  const orderId = String(invId) // Tinkoff uses string OrderId

  // Generate text format for items (for Supabase/Telegram)
  let itemsText = "Товары не указаны";
  let itemsBackup: { id?: number; name: string; quantity: number; price: number; sum: number }[] = [];
  
  if (body.items && Array.isArray(body.items)) {
      itemsText = body.items.map(it => 
          `- ${it.name || 'Товар'} x${it.quantity || 1} (${(it.cost || 0) * (it.quantity || 1)} руб.)`
      ).join('\n');
      
      itemsBackup = body.items.map(it => ({
          id: it.id,
          name: it.name || "Товар",
          quantity: it.quantity || 1,
          price: it.cost || 0,
          sum: (it.cost || 0) * (it.quantity || 1)
      }));
  }

  // Save order to Supabase
  let client = getServiceSupabaseClient()
  if (!client) {
    client = getSupabaseClient()
  }

  if (client) {
    const currentTime = new Date().toISOString();
    const fullText = [
        `📦 ЗАКАЗ #${invId}`,
        `💰 Сумма: ${outSum} руб.`,
        `👤 Клиент: ${body.customerInfo?.name || 'Не указано'}`,
        `🆔 ID клиента: ${body.customerInfo?.client_id || 'Не указано'}`,
        `📧 Email: ${email || 'Не указано'}`,
        `📍 Адрес: ${body.customerInfo?.address || body.customerInfo?.cdek || 'Не указано'}`,
        ``,
        `🛒 Товары:`,
        itemsText,
        ``,
        `🎁 Конкурс:`,
        `Начислено билетов: 0 (ожидает оплаты)`
    ].join('\n');

    const { error } = await client.from("orders").insert({
      id: invId,
      total_amount: outSum,
      items: fullText,
      customer_info: { 
        ...(body.customerInfo || { email }),
        items_backup: itemsBackup,
        discount_amount: body.discountAmount || 0
      },
      promo_code: body.promoCode,
      ref_code: body.refCode,
      status: 'pending',
      updated_at: currentTime
    })
    if (error) {
      console.error("Error creating pending order in Supabase:", error)
    }
  }

  // Prepare Tinkoff Init Request
  const amountKopecks = Math.round(outSum * 100)
  
  const initParams: any = {
      TerminalKey: TERMINAL_KEY,
      Amount: amountKopecks,
      OrderId: orderId,
      Description: description,
      // SuccessURL: `https://.../pay/confirm`, // We can let frontend handle this via URL from response, but Tinkoff might redirect
      // FailURL: `https://.../pay/fail`
      Language: "ru"
  }

  // Add Receipt if items exist
  if (body.items && body.items.length > 0) {
      const receiptItems = body.items.map(it => ({
          Name: sanitizeText(it.name || "Товар").substring(0, 128), // Tinkoff limit
          Price: Math.round((it.cost || 0) * 100),
          Quantity: it.quantity || 1,
          Amount: Math.round(((it.cost || 0) * (it.quantity || 1)) * 100),
          Tax: "none", // or vat0, vat10, vat20. "none" for USN usually.
          PaymentMethod: "full_prepayment",
          PaymentObject: "commodity"
      }))
      
      initParams.Receipt = {
          Email: email || undefined,
          Phone: body.customerInfo?.phone || undefined,
          Taxation: "usn_income", // Simplified or Patent. Adjust as needed.
          FfdVersion: "1.05",
          Items: receiptItems
      }
  }

  // Generate Token
  initParams.Token = generateToken(initParams)

  try {
      const res = await fetch(`${API_URL}/Init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initParams)
      })
      
      const data = await res.json()
      
      if (data.Success) {
          return NextResponse.json({ url: data.PaymentURL, invId })
      } else {
          console.error("Tinkoff Init Error:", data)
          return NextResponse.json({ error: data.Message, details: data.Details }, { status: 400 })
      }
  } catch (e) {
      console.error("Tinkoff Init Failed:", e)
      return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 })
  }
}
