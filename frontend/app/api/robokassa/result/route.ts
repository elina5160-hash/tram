import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"
import { sendTelegramMessage } from "@/lib/telegram"
import { createOrder } from "@/lib/orders"

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

function verifySignature(outSum: string, invId: string, signature: string, password2: string, params?: URLSearchParams) {
  let base = `${outSum}:${invId}:${password2}`
  
  // If params are provided, check for Shp_ parameters
  if (params) {
      const shpParams: { key: string, value: string }[] = []
      params.forEach((value, key) => {
          if (key.startsWith('Shp_')) {
              shpParams.push({ key, value })
          }
      })
      
      // Sort alphabetically by key
      shpParams.sort((a, b) => a.key.localeCompare(b.key))
      
      // Append to base string
      shpParams.forEach(p => {
          base += `:${p.key}=${p.value}`
      })
  }

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
        
        // Transform items to standard format for database and display
        let standardizedItems = Array.isArray(items) ? items.map((it) => {
             const quantity = Number(it?.q ?? it?.quantity ?? 1)
             const sum = Number(it?.s ?? it?.sum ?? 0)
             return {
                 id: it?.i ?? it?.id,
                 name: String(it?.n ?? it?.name ?? 'Товар'),
                 quantity: quantity,
                 price: quantity > 0 ? sum / quantity : 0,
                 sum: sum
             }
        }) : []

        // Fallback: If no items from payload or missing client info, try to fetch from Supabase order
        if (client) {
            try {
                const { data: orderData } = await client
                    .from('orders')
                    .select('*')
                    .eq('id', invId)
                    .single()
                
                if (orderData) {
                    // Restore items if needed
                    if (standardizedItems.length === 0 && orderData.customer_info?.items_backup) {
                        const backup = orderData.customer_info.items_backup
                        if (Array.isArray(backup)) {
                            standardizedItems = backup.map((it: any) => ({
                                id: it.id,
                                name: it.name,
                                quantity: it.quantity,
                                price: it.price,
                                sum: it.sum
                            }))
                            await logDebug("Restored items from Supabase backup", { count: standardizedItems.length })
                        }
                    }

                    // Fallback to summary if still empty
                    if (standardizedItems.length === 0 && payload.summary) {
                         standardizedItems = [{
                             id: 0,
                             name: payload.summary,
                             quantity: 1,
                             price: Number(outSum),
                             sum: Number(outSum)
                         }]
                    }

                    // Restore customer info if missing in payload
                    if (!payload.name) payload.name = orderData.customer_info?.name || ''
                    if (!payload.phone) payload.phone = orderData.customer_info?.phone || ''
                    if (!payload.email) payload.email = orderData.customer_info?.email || ''
                    if (!payload.address) payload.address = orderData.customer_info?.address || ''
                    if (!payload.cdek) payload.cdek = orderData.customer_info?.cdek || ''
                    if (!payload.client) payload.client = orderData.customer_info?.client_id || ''
                    if (!payload.promo) payload.promo = orderData.promo_code || ''
                    if (!payload.ref) payload.ref = orderData.ref_code || ''
                    if (!payload.username) payload.username = orderData.customer_info?.username || ''
                }
            } catch (e) {
                console.error("Failed to restore data from Supabase", e)
            }
        }

        // Prepare items for display
        const lines = standardizedItems.map((it) => {
          return `• ${it.name} × ${it.quantity} — ${it.sum.toLocaleString('ru-RU')} руб.`
        })
        
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
        
        // Calculate tickets
        let ticketsEarned = 0
        if (payload.client) {
             ticketsEarned = Math.floor(Number(outSum) / 1000)
        }

        // Send formatted notification to specific channel
        const productNames = standardizedItems.map(it => it.name).join(', ')
        const notificationText = [
            `📦 ${productNames} #${invId}`,
            `💰 Сумма: ${Number(outSum).toLocaleString('ru-RU')} руб.`,
            `👤 Клиент: ${payload.name || 'Не указано'}`,
            `🆔 ID клиента: ${payload.client || 'Не указано'}`,
            `📧 Email: ${payload.email || 'Не указано'}`,
            `📍 Адрес: ${payload.address || payload.cdek || 'Не указано'}`,
            ``,
            `🎁 Конкурс:`,
            `Начислено билетов: ${ticketsEarned}`,
            `1000р -1 билет`,
            `2000р - 2 билета`,
            `3000р -3 билета`,
            `4000р - 4 билета`
        ].join('\n')

        await sendTelegramMessage(notificationText, '-1003590157576', undefined)
        
        // Also send to admin chat (existing logic)
        const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '2058362528')
        const replyMarkup = payload.client ? { inline_keyboard: [[{ text: 'Написать в личные сообщения', url: `tg://user?id=${payload.client}` }]] } : undefined
        
        // Keep sending the original admin notification as well
        await sendTelegramMessage(text, chatId, replyMarkup)
        
        // Google Sheets integration
        try {
            console.log('Starting Google Sheets integration for order:', invId)
            
            // Fetch username and first_name if client_id exists
            let username = payload.username || ''
            let telegramFirstName = ''
            
            if (payload.client && client) {
                const { data: user } = await client.from('contest_participants').select('username, first_name').eq('user_id', payload.client).single()
                if (user?.username && !username) username = user.username
                if (user?.first_name) telegramFirstName = user.first_name
            }

            const totalQuantity = standardizedItems.reduce((acc, it) => acc + it.quantity, 0)
            
            const deliveryInfo = payload.address 
                ? `${payload.address} ( курьер )`
                : payload.cdek 
                    ? `${payload.cdek} ( СДЭК )` 
                    : 'Не указано'

            const shippingData = [
                `1. ${payload.name || 'Не указано'}`,
                `2. ${payload.phone || 'Не указано'}`,
                `3. ${deliveryInfo}`,
                `4. ${payload.email || 'Не указано'}`
            ].join('\n')

            // Format: USER ID | USER ID LINK | USERNAME | USERNAME LINK | FIRST NAME | DATA | TOTAL | PRODUCT | PARTNER PROMO | СТАТУС | ТРЕК НОМЕР | Данные для отправки | Коменты | Отправка Трека | CATEGORIES | Деньги за доставку | Проверка | ок | Количество
            
            // Create one row per item
            const rows = standardizedItems.map(item => [
                payload.client || '', // USER ID
                'https://tram-navy.vercel.app/', // USER ID LINK
                username || '', // USERNAME
                username ? `https://t.me/${username}` : '', // USERNAME LINK
                telegramFirstName || payload.name || '', // FIRST NAME (Telegram Name or Form Name)
                new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }), // DATA
                Number(outSum).toLocaleString('ru-RU'), // TOTAL (Order Total)
                item.name, // PRODUCT NAME (Specific item)
                payload.promo || '', // PARTNER PROMO
                '', // СТАТУС (пусто по запросу)
                '', // ТРЕК НОМЕР
                shippingData, // Данные для отправки
                '', // Коменты
                '', // Отправка Трека
                '', // CATEGORIES
                '', // Деньги за доставку
                '', // Проверка
                '', // ок
                item.quantity // QUANTITY (Specific item quantity)
            ])

            // If no items (should not happen due to fallback), send a summary row
            if (rows.length === 0) {
                 rows.push([
                    payload.client || '', 
                    'https://tram-navy.vercel.app/', 
                    username || '', 
                    username ? `https://t.me/${username}` : '', 
                    telegramFirstName || payload.name || '', 
                    new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }), 
                    Number(outSum).toLocaleString('ru-RU'), 
                    payload.summary || 'Заказ', 
                    payload.promo || '', 
                    '', '', shippingData, '', '', '', '', '', '', 
                    1
                ])
            }

            const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwGwgJALfqu38YOSClGsr-2XyRoNSi_vlTxpjKHUvbTmMaxkkRpo4EEyPWYkW4MQFgVdQ/exec"
            console.log('Sending to Google Sheet webhook:', webhook)
            // Send object with 'rows' property to handle multiple rows in GAS
            const response = await fetch(webhook, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ rows }) 
            })
            const responseText = await response.text()
            console.log('Google Sheet response:', response.status, responseText)
            await logDebug("Google Sheet response", { status: response.status, text: responseText })
        } catch (e) {
            console.error('Failed to send to Google Sheet', e)
            await logDebug("Google Sheet error", { error: String(e) })
        }
        try {
            // 1. Upsert order (Create or Update) via centralized logic
            await createOrder({
                id: Number(invId),
                total_amount: Number(outSum),
                items: standardizedItems, 
                customer_info: {
                    name: payload.name,
                    phone: payload.phone,
                    email: payload.email,
                    address: payload.address,
                    cdek: payload.cdek,
                    client_id: payload.client 
                },
                promo_code: payload.promo,
                ref_code: payload.ref,
                status: 'Оплачен',
                tickets_earned: ticketsEarned
            })
        } catch (e) {
             console.error('Failed to create order via lib/orders', e)
        }
            
        if (client) {

            // 2. Contest/Referral Logic (Only if client_id exists)
            if (payload.client) {
                const refereeId = Number(payload.client)
                
                // Award tickets for purchase (1 per 1000 rub)
                // ticketsEarned already calculated above
                const tickets = ticketsEarned
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
Проверить билеты можешь в @KonkursEtraBot`
                    
                    const kb6 = { inline_keyboard: [ [{ text: '🛒 Купить ещё', url: 'https://tram-navy.vercel.app/home' }] ] }
                    await sendTelegramMessage(msg6, String(refereeId), kb6)
                } else {
                    // Scenario 11: Purchase < 1000
                    const short = 1000 - Number(outSum)
                    const msg11 = `Спасибо за покупку!
Сумма: ${Number(outSum)} руб

До билета не хватило: ${short} руб
Купи еще на ${short} руб, чтобы получить билет!

Билеты начисляются за каждые 1000 руб в чеке.`
                    
                    const kb11 = { inline_keyboard: [ [{ text: '🛒 Купить ещё', url: 'https://tram-navy.vercel.app/home' }] ] }
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
  const params = url.searchParams
  
  // Log incoming GET request
  await logDebug("Received GET request from Robokassa", { 
      params: Object.fromEntries(params.entries())
  })

  const outSum = params.get("OutSum") || ""
  const invId = params.get("InvId") || ""
  const signature = params.get("SignatureValue") || ""
  
  if (!outSum || !invId || !signature) {
      await logDebug("GET: Missing required parameters", { outSum, invId, signature })
      return NextResponse.json({ error: "Bad params" }, { status: 400 })
  }

  const password2 = process.env.ROBO_PASSWORD2 || ""
  const password1 = process.env.ROBO_PASSWORD1 || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN ? process.env.ROBO_PASSWORD1 || "" : ""
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST || ""
  
  const ok2 = password2 ? verifySignature(outSum, invId, signature, password2, params) : false
  const ok1 = password1 ? verifySignature(outSum, invId, signature, password1, params) : false
  const ok1Test = isTest && password1Test ? verifySignature(outSum, invId, signature, password1Test, params) : false
  
  if (!ok2 && !ok1 && !ok1Test) {
      await logDebug("GET: Signature verification failed", { 
        outSum, invId, signature, 
        calculated2: password2 ? crypto.createHash("md5").update(`${outSum}:${invId}:${password2}`, "utf8").digest("hex") : null
      })
      return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  }

  if (isDup(invId)) {
      await logDebug("GET: Duplicate request ignored", { invId })
      return ack(invId)
  }

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
    username: params.get('Shp_username') || '',
    summary: params.get('Shp_summary') || '',
  }
  await processOrder(invId, outSum, payload)
  return ack(invId)
}

export async function POST(req: Request) {
  try {
    const text = await req.text()
    const params = new URLSearchParams(text)
    
    // Log incoming POST request
    await logDebug("Received POST request from Robokassa", { 
        params: Object.fromEntries(params.entries())
    })

    const outSum = params.get("OutSum") || ""
    const invId = params.get("InvId") || ""
    const signature = params.get("SignatureValue") || ""
    
    if (!outSum || !invId || !signature) {
        await logDebug("POST: Missing required parameters", { outSum, invId, signature })
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const password2 = process.env.ROBO_PASSWORD2 || ""
    const password1 = process.env.ROBO_PASSWORD1 || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN ? process.env.ROBO_PASSWORD1 || "" : ""
    const isTest = process.env.ROBO_IS_TEST === "1"
    const password1Test = process.env.ROBO_PASSWORD1_TEST || ""
    
    const ok2 = password2 ? verifySignature(outSum, invId, signature, password2, params) : false
    const ok1 = password1 ? verifySignature(outSum, invId, signature, password1, params) : false
    const ok1Test = isTest && password1Test ? verifySignature(outSum, invId, signature, password1Test, params) : false

    if (!ok2 && !ok1 && !ok1Test) {
      await logDebug("POST: Signature verification failed", { 
          outSum, invId, signature, 
          calculated2: password2 ? crypto.createHash("md5").update(`${outSum}:${invId}:${password2}`, "utf8").digest("hex") : null 
      })
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (isDup(invId)) {
        await logDebug("POST: Duplicate request ignored", { invId })
        return ack(invId)
    }

    // Parse Shp_ items
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
        username: params.get('Shp_username') || '',
        summary: params.get('Shp_summary') || '',
    }

    await processOrder(invId, outSum, payload)
    return ack(invId)
  } catch (e) {
    console.error("Error processing POST", e)
    await logDebug("Error processing POST request", { error: String(e) })
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
