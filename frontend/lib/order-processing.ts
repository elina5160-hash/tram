import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"
import { sendToGoogleSheet } from "@/lib/google-sheets"

export async function processSuccessfulPayment(invId: string | number, amountKopecks: number) {
    const outSum = amountKopecks / 100 // Convert from kopecks
    const orderId = Number(invId)

    let client = getServiceSupabaseClient()
    if (!client) client = getSupabaseClient()
    
    if (!client) {
        console.error("Database unavailable for processing payment")
        return false
    }

    // 1. Check if already paid to avoid duplicate notifications
    const { data: currentOrder } = await client.from('orders').select('status').eq('id', orderId).single()
    if (currentOrder && (currentOrder.status === 'paid' || currentOrder.status === 'Оплачен')) {
        console.log(`Order ${orderId} is already paid. Skipping processing.`)
        return true
    }

    // 2. Update status
    const { error: updateError } = await client.from('orders').update({ status: 'paid' }).eq('id', orderId)
    if (updateError) {
        console.error("Failed to update order status:", updateError)
        return false
    }
    
    // 3. Fetch Full Order Data
    const { data: orderData } = await client.from('orders').select('*').eq('id', orderId).single()
    
    if (orderData) {
        // Restore Items
        let standardizedItems: any[] = []
        if (typeof orderData.customer_info === 'string') {
            try { orderData.customer_info = JSON.parse(orderData.customer_info) } catch {}
        }
        
        if (orderData.customer_info?.items_backup && Array.isArray(orderData.customer_info.items_backup)) {
            standardizedItems = orderData.customer_info.items_backup
        } else {
            // Fallback
            standardizedItems = [{ name: 'Заказ', quantity: 1, sum: outSum, price: outSum }]
        }

        // Customer Info
        const customer = orderData.customer_info || {}
        const name = customer.name || ''
        const phone = customer.phone || ''
        const email = customer.email || ''
        const address = customer.address || customer.cdek || ''
        const clientId = customer.client_id || ''
        const username = customer.username || ''
        const promo = orderData.promo_code || ''
        const ref = orderData.ref_code || ''

        // Calculate Tickets (Cumulative)
        let ticketsEarned = 0
        let totalSpent = outSum
        let shortForNext = 0

        if (clientId) {
            const { data: pastOrders } = await client
                .from('orders')
                .select('total_amount')
                .eq('customer_info->>client_id', String(clientId))
                .neq('id', orderId)
                .in('status', ['paid', 'Оплачен'])
            
            const pastSpent = pastOrders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0
            const cumulativeSpent = pastSpent + outSum
            
            const totalTickets = Math.floor(cumulativeSpent / 1000)
            const pastTickets = Math.floor(pastSpent / 1000)
            ticketsEarned = Math.max(0, totalTickets - pastTickets)
            totalSpent = cumulativeSpent
            shortForNext = 1000 - (cumulativeSpent % 1000)
        } else {
            ticketsEarned = Math.floor(outSum / 1000)
            shortForNext = 1000 - (outSum % 1000)
        }
        
        // Update tickets_earned in DB
        if (ticketsEarned > 0) {
            await client.from('orders').update({ tickets_earned: ticketsEarned }).eq('id', orderId)
            // Also add to contest table if needed? 
            // Usually 'addTickets' function handles the contest table insertion.
            // But here we are just calculating. 
            // The `sync/route.ts` used `addTickets`. We should probably use it here too.
        }
        
        // We should import addTickets from lib/contest if we want to be consistent.
        // But for now, let's stick to the notification logic which seemed to rely on `sync` for tickets?
        // Wait, `notification/route.ts` did NOT call `addTickets`. It just calculated and sent text.
        // `sync/route.ts` called `addTickets`.
        // Ideally, we should call `addTickets` here to ensure tickets are added even if sync is missed.
        
        // Let's try to dynamically import or use it if available.
        // For now, I will keep the logic from notification/route.ts to ensure stability, 
        // but I should probably call `addTickets` to be safe.
        // Importing `addTickets` from `@/lib/contest`
        try {
             const { addTickets } = require("@/lib/contest")
             if (clientId && ticketsEarned > 0) {
                 await addTickets(clientId, ticketsEarned, 'purchase_reward', String(orderId), true)
             }
        } catch (e) {
             console.error("Failed to add tickets:", e)
        }

        // Send Telegram Receipt to User
        if (clientId) {
            const itemsReceipt = standardizedItems.map(it => 
                ` Товар: ${it.name}\n Количество: ${it.quantity}\n Сумма: ${it.sum.toLocaleString('ru-RU')} руб.`
            ).join('\n\n')

            const receiptText = [
                `Спасибо за покупку!`,
                itemsReceipt,
                ` Общая сумма покупок: ${totalSpent.toLocaleString('ru-RU')} руб.`,
                ``,
                ` До билета не хватило: ${shortForNext} руб.`,
                ` Купи еще на ${shortForNext} руб, чтобы получить билет!`,
                ``,
                ` Билеты начисляются за каждые 1000 руб суммарных покупок.`
            ].join('\n')

            await sendTelegramMessage(receiptText, clientId, undefined)
        }

        // Send Admin Notification
        const productNames = standardizedItems.map(it => it.name).join(', ')
        const notificationText = [
            `📦 ${productNames} #${invId}`,
            `💰 Сумма: ${outSum.toLocaleString('ru-RU')} руб.`,
            `💳 Общая сумма покупок: ${totalSpent.toLocaleString('ru-RU')} руб.`,
            `👤 Клиент: ${name || 'Не указано'}`,
            `🆔 ID клиента: ${clientId || 'Не указано'}`,
            `📧 Email: ${email || 'Не указано'}`,
            `📍 Адрес: ${address || 'Не указано'}`,
            ``,
            `🎁 Конкурс:`,
            `Начислено билетов за этот заказ: ${ticketsEarned}`,
            `Всего билетов за покупки: ${Math.floor(totalSpent / 1000)}`,
            `До следующего билета: ${shortForNext} руб.`
        ].join('\n')

        // Send to Channel
        await sendTelegramMessage(notificationText, '-1003590157576', undefined)
        
        // Send to Admin Personal
        const adminChatId = '2058362528'
        await sendTelegramMessage(notificationText, adminChatId, undefined)

        // Google Sheets
        try {
                await sendToGoogleSheet({
                id: orderId,
                total_amount: outSum,
                items: standardizedItems,
                customer_info: {
                    name, phone, email, address,
                    client_id: clientId,
                    username
                },
                promo_code: promo,
                ref_code: ref,
                created_at: new Date().toISOString()
            })
        } catch (e) {
            console.error("Sheets error:", e)
        }
    }
    
    return true
}
