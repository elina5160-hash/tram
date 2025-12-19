import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"
import { sendTelegramMessage } from "@/lib/telegram"

// Helper for logging
const logDebug = async (msg: string, data?: any) => {
    try {
        const client = getServiceSupabaseClient() || getSupabaseClient()
        if (client) {
            await client.from('bot_logs').insert({ 
                type: 'robokassa_result', 
                message: msg, 
                data: data ? JSON.stringify(data) : null 
            })
        }
    } catch (e) {
        console.error('Failed to log to bot_logs', e)
    }
}

function verifySignature(outSum: string, invId: string, signature: string, password2: string) {
  const base = `${outSum}:${invId}:${password2}`
  const calc = crypto.createHash("md5").update(base, "utf8").digest("hex").toLowerCase()
  return calc === String(signature || "").toLowerCase()
}

function ack(invId: string) {
  return new Response(`OK${invId}`)
}

const recent = new Map<string, number>()
const TTL = 10 * 60 * 1000
function isDup(k: string) {
  const t = recent.get(k) || 0
  const now = Date.now()
  if (t && now - t < TTL) return true
  recent.set(k, now)
  for (const [kk, vv] of recent.entries()) if (now - vv > TTL) recent.delete(kk)
  return false
}

async function appendToSheet(values: (string | number)[]) {
  try {
    const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL || ""
    if (webhook) {
      await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) })
      return
    }
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ""
    const range = process.env.GOOGLE_SHEETS_RANGE || "Sheet1!A1"
    const token = process.env.GOOGLE_ACCESS_TOKEN || ""
    if (spreadsheetId && token) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ values: [values] }) })
    }
  } catch {}
}

async function processOrder(invId: string, outSum: string, payload?: Record<string, string>) {
    let client = getServiceSupabaseClient()
    if (!client) {
      client = getSupabaseClient()
    }

    await logDebug("Processing order...", { invId, outSum, payload })
    
    // Always parse payload and send notifications
    if (payload && Object.keys(payload).length > 0) {
      try {
        const name = payload.name || ""
        const phone = payload.phone || ""
        const email = payload.email || ""
        const address = payload.address || payload.cdek || ""
        const itemsStr = payload.items || ""
        let items: any[] = []
        try {
          const dec = decodeURIComponent(itemsStr)
          items = JSON.parse(dec)
        } catch {}
        
        // Prepare items for display
        const lines = Array.isArray(items) ? items.map((it) => {
          const n = String((it?.n ?? it?.name ?? 'Товар'))
          const q = Number((it?.q ?? it?.quantity ?? 1))
          const s = Number((it?.s ?? it?.sum ?? 0))
          return `• ${n} × ${q} — ${s.toLocaleString('ru-RU')} руб.`
        }) : []
        
        const contact = [
          name ? `👤 ${name}` : '',
          phone ? `📞 <a href="tel:${phone}">${phone}</a>` : '',
          address ? `📍 ${address}` : '',
          email ? `✉️ <a href="mailto:${email}">${email}</a>` : '',
        ].filter(Boolean).join('\n')
        
        const promo = payload.promo ? `Промокод: ${payload.promo}` : ''
        const ref = payload.ref ? `Реф-код: ${payload.ref}` : ''
        const dt = new Date()
        const when = dt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
        
        const text = [
          `✅ Новый заказ № ${invId}`,
          ``,
          name ? `👤 ${name}` : '',
          phone ? `📞 ${phone}` : '',
          address ? `📍 ${address}` : '',
          email ? `✉️ ${email}` : '',
          ``,
          lines.length ? `📦 Заказ:\n${lines.join('\n')}` : '',
          ``,
          `🚚 Доставка: ${address || 'Не указана'}`,
          `🔗 https://t.me/KonkursEtraBot/app`,
          [promo, ref].filter(Boolean).length ? `\n${[promo, ref].filter(Boolean).join('\n')}` : '',
        ].filter(Boolean).join('\n')
        
        const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '2058362528')
        const replyMarkup = payload.client ? { inline_keyboard: [[{ text: 'Написать в личные сообщения', url: `tg://user?id=${payload.client}` }]] } : undefined
        
        await sendTelegramMessage(text, chatId, replyMarkup)
        
        // Google Sheets integration is handled via direct DB sync
        // await appendToSheet(row)

        // DB Operations
        if (client) {
            // 1. Upsert order (Create or Update)
            const orderData = {
                id: Number(invId),
                total_amount: Number(outSum),
                items: items, 
                customer_info: {
                    name: payload.name,
                    phone: payload.phone,
                    email: payload.email,
                    address: payload.address,
                    cdek: payload.cdek,
                    client_id: payload.client 
                },
                // Flat columns for integration (Temporarily disabled)
                // customer_name: payload.name,
                // customer_phone: payload.phone,
                // customer_email: payload.email,
                // delivery_address: payload.address || payload.cdek,
                // order_items_text: lines.join('\n'),

                promo_code: payload.promo,
                ref_code: payload.ref,
                status: 'Оплачен',
                updated_at: new Date().toISOString()
            }
            
            const { error: upsertError } = await client.from('orders').upsert(orderData)
            if (upsertError) {
                console.error('Error upserting order:', upsertError)
            }

            // 2. Contest/Referral Logic (Only if client_id exists)
            if (payload.client) {
                const refereeId = Number(payload.client)
                
                // Award tickets for purchase (1 per 1000 rub)
                const tickets = Math.floor(Number(outSum) / 1000)
                let newTotalTickets = 0
                
                if (tickets > 0) {
                    await addTickets(refereeId, tickets, 'purchase_reward', invId, true)
                    
                    // Fetch updated tickets for notification (Scenario 6)
                    const { data: user } = await client.from('contest_participants').select('tickets').eq('user_id', String(refereeId)).single()
                    newTotalTickets = user?.tickets || 0
                    
                    const msg6 = `🎉 Покупка засчитана!
Ты купил на ${Number(outSum)} руб
Получил: +${tickets} билетов 🎟
Всего билетов: ${newTotalTickets}

Чем больше покупаешь — тем больше шансов! 🔥
Проверить билеты можешь в @PRAEnzyme_bot`
                    
                    const kb6 = { inline_keyboard: [ [{ text: '🛒 Купить ещё', url: 'https://t.me/PRAEnzyme_bot' }] ] }
                    await sendTelegramMessage(msg6, String(refereeId), kb6)
                } else {
                    // Scenario 11: Purchase < 1000
                    const short = 1000 - Number(outSum)
                    const msg11 = `Спасибо за покупку!
Сумма: ${Number(outSum)} руб

До билета не хватило: ${short} руб
Купи еще на ${short} руб, чтобы получить билет!

Билеты начисляются за каждые 1000 руб в чеке.`
                    
                    const kb11 = { inline_keyboard: [ [{ text: '🛒 Купить ещё', url: 'https://t.me/PRAEnzyme_bot' }] ] }
                    await sendTelegramMessage(msg11, String(refereeId), kb11)
                }

                // Award tickets for promo code owner
                if (payload.promo) {
                    const { data: owner } = await client.from('contest_participants').select('user_id').eq('personal_promo_code', payload.promo).single()
                    if (owner && String(owner.user_id) !== String(refereeId)) {
                        await addTickets(owner.user_id, 2, 'friend_purchase_promo', invId, true)
                    }
                }

                // Referral logic
                if (payload.ref) {
                    const referrerId = Number(payload.ref)
                    if (Number.isFinite(referrerId) && referrerId > 0 && referrerId !== refereeId) {
                        const { data: existingRef } = await client.from('contest_referrals').select('referrer_id,referee_id').eq('referee_id', refereeId).single()
                        if (!existingRef) {
                            await client.from('contest_referrals').insert({ referrer_id: referrerId, referee_id: refereeId, status: 'joined' })
                        }
                    }
                }
                
                // Check referral linkage and award bonus if applicable
                const { data: referral } = await client.from('contest_referrals').select('referrer_id,status').eq('referee_id', refereeId).single()
                
                // If linked and this is a purchase (we are processing a paid order)
                // "За каждую покупку друга получишь +1 билет" -> Always give +1 ticket to referrer on purchase?
                // The prompt says: "8. УВЕДОМЛЕНИЕ: ДРУГ КУПИЛ ... Твой друг купил ... Ты получил +1 билет"
                // Previous logic was "welcome_bonus" only once. New logic seems "Every purchase"?
                // "За каждую покупку друга получишь +1 билет" - YES.
                
                if (referral) {
                    // Always award +1 to referrer for friend's purchase
                    await addTickets(referral.referrer_id, 1, 'referral_purchase_bonus', invId, true)
                    
                    // Send Notification to Referrer (Scenario 8)
                    const { data: referrerUser } = await client.from('contest_participants').select('tickets').eq('user_id', String(referral.referrer_id)).single()
                    const referrerTotal = referrerUser?.tickets || 0
                    
                    // Get Buyer Name
                    let buyerName = payload.name || "Твой друг"
                    const { data: buyerUser } = await client.from('contest_participants').select('first_name').eq('user_id', String(refereeId)).single()
                    if (buyerUser?.first_name) buyerName = buyerUser.first_name
                    
                    const msg8 = `💰 Класс!
Твой друг ${buyerName} купил на ${Number(outSum)} руб!
Ты получил: +1 билетов 🎟
Всего билетов: ${referrerTotal}

Шансы растут! Приглашай ещё 🔥`

                    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "KonkursEtraBot"
                    const refLink = `https://t.me/${botUsername}?start=ref_${referral.referrer_id}`
                    const kb8 = { inline_keyboard: [ [{ text: '👥 Пригласить друзей', url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Участвуй в конкурсе ЭТРА!')}` }] ] }
                    
                    await sendTelegramMessage(msg8, String(referral.referrer_id), kb8)

                    // Also handle "welcome bonus" for the friend (first purchase)?
                    // Logic says: "3. Друг получает приветственный бонус" (handled at subscription/start?)
                    // If this is the FIRST purchase, maybe we update status to 'paid'
                    if (referral.status !== 'paid') {
                        // Maybe award extra bonus if defined? Or just mark as paid.
                        // Existing code awarded 'welcome_bonus' here.
                        // I'll keep 'welcome_bonus' but suppressed, just in case.
                         await addTickets(refereeId, 1, 'welcome_bonus', invId, true)
                         await client.from('contest_referrals').update({ status: 'paid' }).eq('referee_id', refereeId)
                    }
                }
            }
        }
      } catch (e) {
        console.error('Error processing order payload', e)
      }
    }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const outSum = url.searchParams.get("OutSum") || ""
  const invId = url.searchParams.get("InvId") || ""
  const signature = url.searchParams.get("SignatureValue") || ""
  const password2 = process.env.ROBO_PASSWORD2 || ""
  const password1 = process.env.ROBO_PASSWORD1 || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN ? process.env.ROBO_PASSWORD1 || "" : ""
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST || ""
  if (!outSum || !invId || !signature) return NextResponse.json({ error: "Bad params" }, { status: 400 })
  const ok2 = password2 ? verifySignature(outSum, invId, signature, password2) : false
  const ok1 = password1 ? verifySignature(outSum, invId, signature, password1) : false
  const ok1Test = isTest && password1Test ? verifySignature(outSum, invId, signature, password1Test) : false
  if (!ok2 && !ok1 && !ok1Test) return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  if (isDup(invId)) return ack(invId)
  const payload: Record<string, string> = {
    name: url.searchParams.get('Shp_name') || '',
    phone: url.searchParams.get('Shp_phone') || '',
    email: url.searchParams.get('Shp_email') || '',
    address: url.searchParams.get('Shp_address') || '',
    cdek: url.searchParams.get('Shp_cdek') || '',
    items: url.searchParams.get('Shp_items') || '',
    promo: url.searchParams.get('Shp_promo') || '',
    ref: url.searchParams.get('Shp_ref') || '',
    client: url.searchParams.get('Shp_client') || '',
  }
  await processOrder(invId, outSum, payload)
  return ack(invId)
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
  
  const bodyText = await req.text()
  let params = new URLSearchParams(bodyText)
  
  const outSum = params.get("OutSum") || ""
  const invId = params.get("InvId") || ""
  const signature = params.get("SignatureValue") || ""
  const shp: Record<string, string> = {}
  
  // Also try JSON if form data is empty (just in case)
  let bodyJson: any = {}
  if (!outSum) {
      try {
          bodyJson = JSON.parse(bodyText)
      } catch {}
  }

  const finalOutSum = outSum || bodyJson.OutSum || bodyJson.outSum || ""
  const finalInvId = invId || bodyJson.InvId || bodyJson.invId || ""
  const finalSignature = signature || bodyJson.SignatureValue || bodyJson.signatureValue || ""

  await logDebug(`Received Robokassa Request: ${finalInvId}`, { 
      outSum: finalOutSum, 
      invId: finalInvId, 
      signature: finalSignature,
      body: bodyText
  })

  if (!finalOutSum || !finalInvId || !finalSignature) {
      await logDebug("Missing required params")
      return NextResponse.json({ error: "Bad params" }, { status: 400 })
  }

  const password2 = process.env.ROBO_PASSWORD2 || ""
  if (!password2) {
      await logDebug("Missing ROBO_PASSWORD2")
      return NextResponse.json({ error: "Server config error" }, { status: 500 })
  }

  const ok = verifySignature(finalOutSum, finalInvId, finalSignature, password2)
  if (!ok) {
      await logDebug("Signature mismatch", { expected: "???", received: finalSignature })
      return NextResponse.json({ error: "Signature mismatch" }, { status: 400 })
  }

  // Parse custom params (Shp_)
  params.forEach((v, k) => {
      if (k.startsWith("Shp_")) shp[k] = v
  })
  
  // If JSON was used
  if (Object.keys(shp).length === 0 && bodyJson) {
      Object.keys(bodyJson).forEach(k => {
          if (k.startsWith("Shp_")) shp[k] = bodyJson[k]
      })
  }
  
  // Reconstruct payload
  const payload: any = {}
  if (shp.Shp_promo) payload.promo = shp.Shp_promo
  if (shp.Shp_ref) payload.ref = shp.Shp_ref
  if (shp.Shp_name) payload.name = shp.Shp_name
  if (shp.Shp_phone) payload.phone = shp.Shp_phone
  if (shp.Shp_email) payload.email = shp.Shp_email
  if (shp.Shp_address) payload.address = shp.Shp_address
  if (shp.Shp_cdek) payload.cdek = shp.Shp_cdek
  if (shp.Shp_client) payload.client = shp.Shp_client
  if (shp.Shp_items) payload.items = shp.Shp_items
  
  await logDebug("Processing order...", { payload })
  
  await processOrder(finalInvId, finalOutSum, payload)
  
  await logDebug("Order processed successfully")

  return ack(finalInvId)
}
