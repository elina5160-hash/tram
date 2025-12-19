import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"
import { sendTelegramMessage } from "@/lib/telegram"

function verifySignature(outSum: string, invId: string, signature: string, password2: string) {
  const base = `${outSum}:${invId}:${password2}`
  const calc = crypto.createHash("md5").update(base, "utf8").digest("hex").toLowerCase()
  return calc === String(signature || "").toLowerCase()
}

function ack(invId: string) {
  return new Response(`OK${invId}`)
}

function formatCustomerInfo(ci: unknown, emailFallback: string = "") {
  if (typeof ci === "string") return ci.trim()
  if (typeof ci === "object" && ci !== null) {
    const o = ci as Record<string, unknown>
    const name = typeof o.name === "string" ? o.name.trim() : ""
    const phone = typeof o.phone === "string" ? o.phone.trim() : ""
    const address = typeof o.address === "string" ? o.address.trim() : ""
    const cdek = typeof o.cdek === "string" ? o.cdek.trim() : ""
    const email = typeof o.email === "string" ? o.email.trim() : emailFallback
    const addr = address ? `${address} (курьер)` : (cdek ? `ПВЗ СДЭК: ${cdek}` : "")
    return [name, phone, addr, email].filter(Boolean).join("\n")
  }
  return emailFallback
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
          `<b>Оплачен заказ № ${invId}</b>`,
          `Сумма: ${Number(outSum).toLocaleString('ru-RU')} руб.`,
          `Дата: ${when}`,
          lines.length ? `\n<b>Товары:</b>\n${lines.join('\n')}` : '',
          contact ? `\n<b>Пользователь</b>\n${contact}` : '',
          [promo, ref].filter(Boolean).length ? `\n${[promo, ref].filter(Boolean).join('\n')}` : '',
        ].filter(Boolean).join('\n')
        
        const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '2058362528')
        const replyMarkup = payload.client ? { inline_keyboard: [[{ text: 'Написать в личные сообщения', url: `tg://user?id=${payload.client}` }]] } : undefined
        
        await sendTelegramMessage(text, chatId, replyMarkup)
        
        const row = [new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }), invId, Number(outSum), contact.replace(/\n/g, ' | '), payload.ref || '']
        await appendToSheet(row)

        // DB Operations
        if (client) {
            // 1. Upsert order (Create or Update)
            // Even if client_id is missing, we must save the order!
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
                    client_id: payload.client // might be empty string
                },
                promo_code: payload.promo,
                ref_code: payload.ref,
                status: 'Оплачен',
                ok: 'true',
                paid_at: new Date().toISOString(),
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
                if (tickets > 0) {
                    await addTickets(refereeId, tickets, 'purchase_reward', invId)
                }

                // Award tickets for promo code owner
                if (payload.promo) {
                    const { data: owner } = await client.from('contest_participants').select('user_id').eq('personal_promo_code', payload.promo).single()
                    if (owner && String(owner.user_id) !== String(refereeId)) {
                        await addTickets(owner.user_id, 2, 'friend_purchase_promo', invId)
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
                const { data: referral } = await client.from('contest_referrals').select('referrer_id,status').eq('referee_id', refereeId).single()
                if (referral && referral.status !== 'paid') {
                    await addTickets(referral.referrer_id, 1, 'referral_purchase_bonus', invId)
                    await addTickets(refereeId, 1, 'welcome_bonus', invId)
                    await client.from('contest_referrals').update({ status: 'paid' }).eq('referee_id', refereeId)
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
  const password2 = process.env.ROBO_PASSWORD2 || ""
  const password1 = process.env.ROBO_PASSWORD1 || ""
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST || ""
  let bodyText = ""
  try { bodyText = await req.text() } catch {}
  const params = new URLSearchParams(bodyText)
  const outSum = params.get("OutSum") || ""
  const invId = params.get("InvId") || ""
  const signature = params.get("SignatureValue") || ""
  if (!outSum || !invId || !signature) return NextResponse.json({ error: "Bad params" }, { status: 400 })
  const ok2 = password2 ? verifySignature(outSum, invId, signature, password2) : false
  const ok1 = password1 ? verifySignature(outSum, invId, signature, password1) : false
  const ok1Test = isTest && password1Test ? verifySignature(outSum, invId, signature, password1Test) : false
  if (!ok2 && !ok1 && !ok1Test) return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  if (isDup(invId)) return ack(invId)
  const payload: Record<string, string> = {
    name: params.get('Shp_name') || '',
    phone: params.get('Shp_phone') || '',
    email: params.get('Shp_email') || '',
    address: params.get('Shp_address') || '',
    cdek: params.get('Shp_cdek') || '',
    items: params.get('Shp_items') || '',
    promo: params.get('Shp_promo') || '',
    ref: params.get('Shp_ref') || '',
    client: params.get('Shp_client') || '',
  }
  await processOrder(invId, outSum, payload)
  return ack(invId)
}
