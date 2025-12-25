import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"

function sanitizeText(input: string | number) {
  return Array.from(String(input)).filter((ch) => !/\p{Extended_Pictographic}/u.test(ch) && ch !== "\u200D" && ch !== "\uFE0F").join("")
}

export async function GET() {
  return NextResponse.json({ ok: true, status: "active" })
}

export async function POST(req: Request) {
  try {
    const merchant = process.env.ROBO_MERCHANT_LOGIN?.trim()
    const password1Raw = process.env.ROBO_PASSWORD1?.trim()
    const isTest = process.env.ROBO_IS_TEST === "1"
    const password1Test = process.env.ROBO_PASSWORD1_TEST?.trim()

    const password1ToUse = isTest ? password1Test : password1Raw

    if (!merchant || !password1ToUse) {
      return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
    }
  
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const outSum = Number(body.outSum)
    if (isNaN(outSum) || outSum <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }
  
    const description = sanitizeText(body.description || "Оплата заказа")
    const email = body.email || ""
    // Use provided invId if valid number, else generate new one
    let invId = body.invId && typeof body.invId === "number" ? body.invId : Math.floor(Date.now() / 1000)
    
    // --- SAFE SUPABASE & TELEGRAM BLOCK ---
    try {
        // Generate text format for items
        let itemsText = "Товары не указаны";
        let itemsBackup: any[] = [];
        
        if (body.items && Array.isArray(body.items)) {
            itemsText = body.items.map((it: any) => 
                `- ${it.name || 'Товар'} x${it.quantity || 1} (${(it.cost || 0) * (it.quantity || 1)} руб.)`
            ).join('\n');
            
            itemsBackup = body.items.map((it: any) => ({
                id: it.id,
                name: it.name || "Товар",
                quantity: it.quantity || 1,
                price: it.cost || 0,
                sum: (it.cost || 0) * (it.quantity || 1)
            }));
        }

        let client = null
        try { client = getServiceSupabaseClient() } catch {}
        if (!client) {
            try { client = getSupabaseClient() } catch {}
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

            await client.from("orders").insert({
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
        }

        const tickets = Math.floor(outSum / 1000);
        let ticketsText = `Начислено билетов: ${tickets}`;
        if (tickets > 0) {
            ticketsText += `\n(1000р - 1 билет, 2000р - 2 билета и т.д.)`;
        } else {
            ticketsText += ` (ожидает оплаты)`;
        }

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

    } catch (e) {
        console.error("Side effects error (DB/Telegram):", e)
    }
    // --- END SAFE BLOCK ---

    let receiptEncodedOnce = ""
    
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

    if (body.items && body.items.length > 0) {
        const summary = body.items.map((it: any) => `${it.name || 'Товар'} (x${it.quantity || 1})`).join(', ')
        shp.Shp_summary = sanitizeText(summary).substring(0, 500)
    }

    if (body.items && body.items.length > 0) {
      try {
        const receiptItems = body.items.map((it: any) => ({
          name: sanitizeText(it.name || "Товар"),
          quantity: it.quantity || 1,
          sum: (it.cost || 0) * (it.quantity || 1),
          tax: it.tax || "none",
          payment_method: it.paymentMethod || "full_prepayment",
          payment_object: it.paymentObject || "commodity"
        }))
        const receiptJson = JSON.stringify({ items: receiptItems })
        // Encoding Level 1
        receiptEncodedOnce = encodeURIComponent(receiptJson)
      } catch {}
    }

    const out = outSum.toString()
    const baseParts = [merchant, out, String(invId)]
    
    // Robokassa expects the signature to be calculated using the 1x encoded Receipt
    // (because Robokassa decodes the URL parameter from 2x to 1x before verification)
    if (receiptEncodedOnce) baseParts.push(receiptEncodedOnce)
    
    baseParts.push(password1ToUse as string)
    let signatureBase = baseParts.join(":")
    
    const sortedKeys = Object.keys(shp).sort()
    const shpString = sortedKeys.map(k => `${k}=${shp[k]}`).join(':')

    if (shpString) signatureBase = `${signatureBase}:${shpString}`
    const signature = crypto.createHash("md5").update(signatureBase, "utf8").digest("hex")
    
    const params = new URLSearchParams()
    params.set("MerchantLogin", merchant)
    params.set("OutSum", out)
    params.set("InvId", String(invId))
    params.set("Description", description)
    params.set("SignatureValue", signature)
    
    // Adding 1x encoded string to URLSearchParams will result in 2x encoded string in the final URL
    // (e.g. %7B -> %257B)
    if (receiptEncodedOnce) params.set("Receipt", receiptEncodedOnce)
    
    if (email) params.set("Email", email)
    sortedKeys.forEach((k) => params.set(k, shp[k]))
    if (isTest) params.set("IsTest", "1")
    
    params.set("Culture", "ru")
    
    const url = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
    
    return NextResponse.json({ url, invId })
  } catch (e) {
    console.error("Critical error in robokassa/create:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
