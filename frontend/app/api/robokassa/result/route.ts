import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"
import { sendTelegramMessage } from "@/lib/telegram"
import { createOrder } from "@/lib/orders"
import { sendToGoogleSheet } from "@/lib/google-sheets"

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
        let orderData: any = null
        let supabaseError: any = null
        
        // Log client status
        if (!client) {
            console.error("No Supabase client available (Service Role or Anon)")
        } else {
            const isService = !!process.env.SUPABASE_SERVICE_ROLE_KEY
            // console.log("Using Supabase client. Service role available:", isService)
        }

        if (client) {
            try {
                // Try fetching by ID
                const { data, error } = await client
                    .from('orders')
                    .select('*')
                    .eq('id', invId)
                    .single()
                
                if (error) {
                    supabaseError = error
                    console.error("Supabase fetch error:", error)
                    
                    // Retry with number conversion if ID looks numeric
                    if (!data && /^\d+$/.test(invId)) {
                        const { data: retryData, error: retryError } = await client
                            .from('orders')
                            .select('*')
                            .eq('id', Number(invId))
                            .single()
                        if (retryData) {
                             orderData = retryData
                             console.log("Found order on retry with numeric ID")
                        }
                    }
                } else {
                    orderData = data
                }
                
                if (orderData) {
                    // Ensure customer_info is an object (handle if stored as string in DB)
                    if (typeof orderData.customer_info === 'string') {
                        try {
                            orderData.customer_info = JSON.parse(orderData.customer_info)
                        } catch (e) {
                            console.error("Failed to parse customer_info JSON", e)
                        }
                    }

                    // Always prefer items from backup if available, as they are more reliable/detailed than Shp_items
                    if (orderData.customer_info?.items_backup && Array.isArray(orderData.customer_info.items_backup)) {
                        const backup = orderData.customer_info.items_backup
                        standardizedItems = backup.map((it: any) => ({
                            id: it.id,
                            name: it.name,
                            quantity: it.quantity,
                            price: it.price,
                            sum: it.sum
                        }))
                        await logDebug("Restored items from Supabase backup", { count: standardizedItems.length })
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

        // Determine Final Client ID and Username early
        const finalClientId = payload.client || orderData?.customer_info?.client_id
        const finalUsername = payload.username || orderData?.customer_info?.username || ''
        
        console.log(`[ROBOKASSA_RESULT] Processing order ${invId}. Payload client: '${payload.client}', DB client: '${orderData?.customer_info?.client_id}', Final: '${finalClientId}'`)
        if (!finalClientId) {
             console.warn(`[ROBOKASSA_RESULT] WARNING: No client_id found for order ${invId}! This order will not be visible in history.`)
        }

        // Update order in Supabase with finalized data and status
        if (client && invId) {
             try {
                 const updateData: any = {
                     status: 'paid', // Explicitly mark as paid
                     updated_at: new Date().toISOString()
                 }
                 
                 // If we found a client ID in payload, always ensure it's saved if it's missing or if we want to enforce it
                 // Current logic: if we have a valid finalClientId, ensure it's in customer_info
                 if (finalClientId) {
                     const currentInfo = orderData?.customer_info || {}
                     // Update if missing or different (though usually we trust the one in DB if it exists, but payload is from the payment time)
                     // Let's stick to: if missing in DB, add it.
                     if (!currentInfo.client_id || currentInfo.client_id === 'undefined' || currentInfo.client_id === 'null') {
                         const updatedCustomerInfo = {
                             ...currentInfo,
                             client_id: finalClientId,
                             username: finalUsername
                         }
                         // Ensure we don't overwrite with empty values if they exist in DB but not here
                         if (!updatedCustomerInfo.name && payload.name) updatedCustomerInfo.name = payload.name;
                         if (!updatedCustomerInfo.phone && payload.phone) updatedCustomerInfo.phone = payload.phone;
                         
                         updateData.customer_info = updatedCustomerInfo
                     }
                 }

                 // Use the ID from the fetched order if available (to ensure type correctness), otherwise invId
                 const targetId = orderData?.id || invId

                 const { error: updateError } = await client
                     .from('orders')
                     .update(updateData)
                     .eq('id', targetId)

                 if (updateError) {
                     console.error("Failed to update order status/info in Supabase:", updateError)
                 } else {
                     console.log(`Order ${targetId} marked as paid and updated with client info if needed.`)
                 }
             } catch (e) {
                 console.error("Error updating order in Supabase:", e)
             }
        }

        // Fix: If we have only 1 item but it looks like a combined list (newline separated or comma separated), parse it
        if (standardizedItems.length === 1) {
            const singleName = standardizedItems[0].name;
            
            // Check for newline format: "- Item x1 (100 руб.)"
            if (singleName.includes('\n-') || singleName.startsWith('- ')) {
                const lines = singleName.split('\n').map(l => l.trim()).filter(l => l.startsWith('-'));
                if (lines.length > 1) {
                    const parsedItems = [];
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        // Try to extract: "- Name xQty (Sum руб.)"
                        // Regex: - (anything) x(number) ((number) руб.)
                        const match = line.match(/^-\s+(.+?)\s+x(\d+)\s+\((\d+)\s+руб\.\)$/);
                        if (match) {
                            parsedItems.push({
                                id: `parsed-${i}-${Date.now()}`,
                                name: match[1],
                                quantity: Number(match[2]),
                                sum: Number(match[3]),
                                price: Number(match[3]) / Number(match[2])
                            });
                        } else {
                            // Fallback simple split
                            parsedItems.push({
                                id: `parsed-fallback-${i}-${Date.now()}`,
                                name: line.replace(/^- /, ''),
                                quantity: 1,
                                sum: 0, 
                                price: 0
                            });
                        }
                    }
                    if (parsedItems.length > 0) {
                        // Distribute total sum if individual sums are 0
                        const totalParsedSum = parsedItems.reduce((acc, it) => acc + it.sum, 0);
                        if (totalParsedSum === 0 && Number(outSum) > 0) {
                             const pricePerItem = Number(outSum) / parsedItems.length;
                             parsedItems.forEach(it => {
                                 it.sum = Number(pricePerItem.toFixed(2)); 
                                 it.price = Number(pricePerItem.toFixed(2));
                             });
                        }

                        standardizedItems = parsedItems;
                        console.log("Parsed combined items from newline string:", standardizedItems);
                    }
                }
            } 
            // Check for comma format: "Item (x1), Item (x2)"
            else if (singleName.includes(', ') && singleName.includes('(x')) {
                const parts = singleName.split(', ');
                if (parts.length > 1) {
                    const parsedItems = [];
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        // Try to extract: "Name (xQty)"
                        const match = part.match(/^(.+?)\s+\(x(\d+)\)$/);
                        if (match) {
                            parsedItems.push({
                                id: `parsed-comma-${i}-${Date.now()}`,
                                name: match[1],
                                quantity: Number(match[2]),
                                sum: 0, 
                                price: 0
                            });
                        }
                    }
                    if (parsedItems.length > 0) {
                        // Distribute total sum if individual sums are 0
                        const totalParsedSum = parsedItems.reduce((acc, it) => acc + it.sum, 0);
                        if (totalParsedSum === 0 && Number(outSum) > 0) {
                             const pricePerItem = Number(outSum) / parsedItems.length;
                             parsedItems.forEach(it => {
                                 it.sum = Number(pricePerItem.toFixed(2));
                                 it.price = Number(pricePerItem.toFixed(2));
                             });
                        }

                        standardizedItems = parsedItems;
                        console.log("Parsed combined items from comma string:", standardizedItems);
                    }
                }
            }
        }

        // NORMALIZE ITEM SUMS TO MATCH OutSum (handling discounts/promo codes)
        // If the sum of items differs from the actual paid amount (OutSum), redistribute the difference.
        if (standardizedItems.length > 0) {
            const currentTotal = standardizedItems.reduce((acc, it) => acc + (it.sum || 0), 0);
            const paidTotal = Number(outSum);
            
            // If difference is significant (e.g. > 1 rub), applies if promo code reduced the total but items kept original price
            if (Math.abs(currentTotal - paidTotal) > 1.0) {
                console.log(`Normalizing items total: ItemsSum=${currentTotal} vs Paid=${paidTotal}`);
                const ratio = paidTotal / currentTotal;
                
                let runningTotal = 0;
                standardizedItems.forEach((it, index) => {
                    // Scale sum
                    let newSum = it.sum * ratio;
                    
                    // Round to 2 decimals
                    newSum = Math.round(newSum * 100) / 100;
                    
                    // Adjust last item to handle rounding errors
                    if (index === standardizedItems.length - 1) {
                         const diff = paidTotal - runningTotal;
                         // If diff is reasonable (close to newSum), use it. 
                         // Otherwise, if it's huge, something is wrong, but here we just want to match total.
                         newSum = Math.round(diff * 100) / 100;
                    }
                    
                    it.sum = newSum;
                    it.price = it.quantity > 0 ? newSum / it.quantity : 0;
                    runningTotal += newSum;
                });
            }
        }

        // Prepare items for display
        const lines = standardizedItems.map((it) => {
          return `• ${it.name} × ${it.quantity} — ${it.sum.toLocaleString('ru-RU')} руб.`
        })
        
        const contact = [
          name ? `👤 ${name}` : '',
          payload.username ? `🔹 @${payload.username.replace('@', '')}` : '',
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
          payload.username ? `🔹 @${payload.username.replace('@', '')}` : '',
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
        
        // Calculate tickets (Cumulative Logic)
        let ticketsEarned = 0
        let totalSpent = Number(outSum)
        let shortForNext = 0
        
        if (finalClientId) {
             if (client) {
                 try {
                     // Fetch past paid orders to calculate cumulative spend
                     // We use customer_info->>client_id to identify the user's orders
                     const { data: pastOrders } = await client
                        .from('orders')
                        .select('total_amount')
                        .eq('customer_info->>client_id', finalClientId)
                        .neq('id', invId) // Exclude current if somehow present
                        .in('status', ['paid', 'Оплачен'])
                     
                     const pastSpent = pastOrders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0
                     const cumulativeSpent = pastSpent + Number(outSum)
                     
                     const totalTicketsFromSpend = Math.floor(cumulativeSpent / 1000)
                     const pastTicketsFromSpend = Math.floor(pastSpent / 1000)
                     
                     ticketsEarned = Math.max(0, totalTicketsFromSpend - pastTicketsFromSpend)
                     totalSpent = cumulativeSpent
                     shortForNext = 1000 - (cumulativeSpent % 1000)
                     
                     console.log(`Cumulative Spend: ${cumulativeSpent} (Past: ${pastSpent} + Curr: ${outSum}). Tickets: ${ticketsEarned}`)
                 } catch (e) {
                     console.error("Error calculating cumulative tickets:", e)
                     // Fallback to simple logic if DB fails
                     ticketsEarned = Math.floor(Number(outSum) / 1000)
                     shortForNext = 1000 - (Number(outSum) % 1000)
                 }
             } else {
                 // Fallback if no client available
                 ticketsEarned = Math.floor(Number(outSum) / 1000)
                 shortForNext = 1000 - (Number(outSum) % 1000)
             }
        }

        if (finalClientId) {
             const itemsReceipt = standardizedItems.map(it => 
                ` Товар: ${it.name}\n Количество: ${it.quantity}\n Сумма: ${it.sum.toLocaleString('ru-RU')} руб.`
            ).join('\n\n')

            // Notification is now handled in the contest logic block below to avoid duplicates
            // We just prepare itemsReceipt here if needed later, or we can move it down.
        }

        // Send formatted notification to specific channel
        const productNames = standardizedItems.map(it => it.name).join(', ')
        const notificationText = [
            `📦 ${productNames} #${invId}`,
            `💰 Сумма: ${Number(outSum).toLocaleString('ru-RU')} руб.`,
            `💳 Общая сумма покупок: ${totalSpent.toLocaleString('ru-RU')} руб.`,
            `👤 Клиент: ${payload.name || 'Не указано'}`,
            `🆔 ID клиента: ${payload.client || 'Не указано'}`,
            `📧 Email: ${payload.email || 'Не указано'}`,
            `📍 Адрес: ${payload.address || payload.cdek || 'Не указано'}`,
            ``,
            `🎁 Конкурс:`,
            `Начислено билетов за этот заказ: ${ticketsEarned}`,
            `Всего билетов за покупки: ${Math.floor(totalSpent / 1000)}`,
            `До следующего билета: ${shortForNext} руб.`,
            `1000р = 1 билет (накопительно)`
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
            let telegramFirstName = ''
            let telegramUsername = payload.username || ''
            let clientId = payload.client || ''
            
            // Stronger restoration from DB
            if (orderData?.customer_info) {
                if (!clientId) clientId = orderData.customer_info.client_id || ''
                if (!telegramUsername) telegramUsername = orderData.customer_info.username || ''
            }

            if (clientId && client) {
                const { data: user } = await client.from('contest_participants').select('username, first_name').eq('user_id', clientId).single()
                if (user?.first_name) telegramFirstName = user.first_name
                if (user?.username && !telegramUsername) telegramUsername = user.username
            }
            
            await sendToGoogleSheet({
                id: invId,
                total_amount: Number(outSum),
                items: standardizedItems,
                customer_info: { 
                    ...(payload || {}),
                    ...(orderData?.customer_info || {}), // Merge DB info to ensure fields like client_id exist
                    client_id: clientId,
                    user_id: clientId,
                    first_name: telegramFirstName,
                    username: telegramUsername
                },
                promo_code: payload.promo || orderData?.promo_code,
                ref_code: payload.ref || orderData?.ref_code,
                status: 'Оплачен'
            })
            
        } catch (e) {
            console.error('Failed to send to Google Sheet', e)
            await logDebug("Google Sheet error", { error: String(e) })
        }
        try {
            // 1. Upsert order (Create or Update) via centralized logic
            const finalClientId = payload.client || orderData?.customer_info?.client_id
            
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
                    client_id: finalClientId 
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

            // 2. Contest/Referral Logic (Use finalClientId which is more robust)
            if (finalClientId) {
                const refereeId = Number(finalClientId)
                
                // Re-prepare items receipt for notification
                 const itemsReceipt = standardizedItems.map(it => 
                    ` Товар: ${it.name}\n Количество: ${it.quantity}\n Сумма: ${it.sum.toLocaleString('ru-RU')} руб.`
                ).join('\n\n')

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
${itemsReceipt}

Ты купил на ${Number(outSum)} руб
Общая сумма покупок: ${totalSpent} руб
Получил: +${tickets} билетов 🎟
Всего билетов: ${newTotalTickets}

До следующего билета: ${shortForNext} руб

Чем больше покупаешь — тем больше шансов! 🔥
Проверить билеты можешь в @KonkursEtraBot`
                    
                    const kb6 = { inline_keyboard: [ [{ text: '🛒 Купить ещё', url: 'https://tram-navy.vercel.app/home' }] ] }
                    await sendTelegramMessage(msg6, String(refereeId), kb6)
                } else {
                    // Scenario 11: Purchase < 1000 (or not enough cumulative for new ticket)
                    const msg11 = `Спасибо за покупку!
${itemsReceipt}

Сумма: ${Number(outSum)} руб
Общая сумма покупок: ${totalSpent} руб

До билета не хватило: ${shortForNext} руб
Купи еще на ${shortForNext} руб, чтобы получить билет!

Билеты начисляются за каждые 1000 руб суммарных покупок.`
                    
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
                    if (referral.status !== 'paid') {
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
