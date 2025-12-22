import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"

import { sendToGoogleSheet } from "@/lib/google-sheets"

function sanitizeText(input: string | number) {
  return Array.from(String(input)).filter((ch) => !/\p{Extended_Pictographic}/u.test(ch) && ch !== "\u200D" && ch !== "\uFE0F").join("")
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
  
  // Generate text format for items to match standard order format
  let itemsText = "Товары не указаны";
  let itemsBackup: { id?: number; name: string; quantity: number; price: number; sum: number }[] = [];
  
  if (body.items && Array.isArray(body.items)) {
      itemsText = body.items.map(it => 
          `- ${it.name || 'Товар'} x${it.quantity || 1} (${(it.cost || 0) * (it.quantity || 1)} руб.)`
      ).join('\n');
      
      // Prepare backup with IDs for repeat functionality
      itemsBackup = body.items.map(it => ({
          id: it.id,
          name: it.name || "Товар",
          quantity: it.quantity || 1,
          price: it.cost || 0,
          sum: (it.cost || 0) * (it.quantity || 1)
      }));
  }

  // Сохраняем заказ в Supabase (если настроены переменные окружения)
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

  // Send Telegram notification about order attempt
  try {
      // Calculate tickets
      const tickets = Math.floor(outSum / 1000);
      let ticketsText = `Начислено билетов: ${tickets}`;
      if (tickets > 0) {
          ticketsText += `\n(1000р - 1 билет, 2000р - 2 билета и т.д.)`;
      } else {
          ticketsText += ` (ожидает оплаты)`;
      }

      // Format product name for title (take first product or default)
      let productTitle = "Заказ";
      if (body.items && body.items.length > 0) {
        productTitle = body.items[0].name || "Заказ";
        if (body.items.length > 1) {
            productTitle += " и др.";
        }
      }

      const username = body.customerInfo?.username ? `@${body.customerInfo.username.replace('@', '')}` : 'Не указано';
      const clientId = body.customerInfo?.client_id || 'Не указано';
      
      const msg = [
          `📦 ${productTitle} #${invId}`,
          `💰 Сумма: ${outSum} руб.`,
          `👤 Клиент: ${body.customerInfo?.name || 'Не указано'}`,
          `🆔 ID клиента: ${clientId} (${username})`,
          `📞 Телефон: ${body.customerInfo?.phone || 'Не указано'}`,
          `📧 Email: ${email || 'Не указано'}`,
          `📍 Адрес: ${body.customerInfo?.address || body.customerInfo?.cdek || 'Не указано'}`,
          ``,
          `🎁 Конкурс:`,
          ticketsText
      ].join('\n');

      await sendTelegramMessage(msg);

      // Send to Google Sheets (fire and forget to not block payment)
      sendToGoogleSheet({
        id: invId,
        total_amount: outSum,
        items: itemsText, // Text format
        customer_info: { 
            ...(body.customerInfo || { email }),
            items_backup: itemsBackup // Structured format if needed by script
        },
        promo_code: body.promoCode,
        ref_code: body.refCode,
        status: 'pending'
      }).catch(e => console.error("Background Google Sheet send failed:", e))

  } catch (e) {
      console.error("Failed to send notification:", e);
  }

  let receiptEncodedOnce = ""
  let receiptEncodedTwice = ""
  
  // Prepare Shp_ parameters for callback
  const shp: Record<string, string> = {
    Shp_name: sanitizeText(body.customerInfo?.name || ''),
    Shp_phone: sanitizeText(body.customerInfo?.phone || ''),
    Shp_email: sanitizeText(email || ''),
    Shp_address: sanitizeText(body.customerInfo?.address || ''),
    Shp_cdek: sanitizeText(body.customerInfo?.cdek || ''),
    Shp_promo: sanitizeText(body.promoCode || ''),
    Shp_ref: sanitizeText(body.refCode || ''),
    Shp_client: sanitizeText(body.customerInfo?.client_id || ''),
    Shp_username: sanitizeText(body.customerInfo?.username || '')
  }

  // Add Shp_summary with product names as a fallback for notification
  if (body.items && body.items.length > 0) {
      const summary = body.items.map(it => `${it.name || 'Товар'} (x${it.quantity || 1})`).join(', ')
      shp.Shp_summary = sanitizeText(summary).substring(0, 500) // Limit length just in case
  }

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
      // Note: Shp_items removed to avoid signature issues. 
      // Items are restored from Supabase in result/route.ts
    } catch {}
  }

  const out = outSum.toString()
  const baseParts = [merchant, out, String(invId)]
  // Receipt must be included in the signature for Merchant/Index.aspx
  // Support requested Double Encoded in URL. This means Server sees Single Encoded.
  // So Base must use Single Encoded.
  if (receiptEncodedTwice) baseParts.push(receiptEncodedOnce)
  baseParts.push(password1ToUse as string)
  let signatureBase = baseParts.join(":")
  
  const sortedKeys = Object.keys(shp).sort()
  const shpString = sortedKeys.map(k => `${k}=${shp[k]}`).join(':')

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
  if (receiptEncodedTwice) params.set("Receipt", receiptEncodedOnce)
  
  if (email) params.set("Email", email)
  sortedKeys.forEach((k) => params.set(k, shp[k]))
  if (isTest) params.set("IsTest", "1")
  
  params.set("Culture", "ru")
  
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
  return NextResponse.json({ url, invId })
}
