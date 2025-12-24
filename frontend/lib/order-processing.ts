import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"
import { sendToGoogleSheet } from "@/lib/google-sheets"
import { addTickets } from "@/lib/contest"

export async function processSuccessfulPayment(invId: string | number, amountKopecks: number) {
    const outSum = amountKopecks / 100 // Convert from kopecks
    const orderId = Number(invId)

    let client = getServiceSupabaseClient()
    if (!client) client = getSupabaseClient()
    
    if (!client) {
        console.error("Database unavailable for processing payment")
        return false
    }

    // 1. Check if order exists
    const { data: currentOrder } = await client.from('orders').select('status').eq('id', orderId).single()
    
    if (!currentOrder) {
        console.warn(`Order ${orderId} not found in DB. Creating recovery record...`)
        // Create recovery record
        const { error: insertError } = await client.from('orders').insert({
            id: orderId,
            total_amount: outSum,
            status: 'paid',
            currency: 'RUB',
            items: 'Восстановлен из уведомления об оплате',
            customer_info: {
                description: 'Recovered from payment notification',
                is_recovery: true
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        
        if (insertError) {
             console.error("Failed to create recovery order:", insertError)
             return false
        }
    } else if (currentOrder.status === 'paid' || currentOrder.status === 'Оплачен') {
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
        let cumulativeSpent = outSum

        if (clientId) {
            const { data: pastOrders } = await client
                .from('orders')
                .select('total_amount')
                .eq('customer_info->>client_id', String(clientId))
                .neq('id', orderId)
                .in('status', ['paid', 'Оплачен'])
            
            const pastSpent = pastOrders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0
            cumulativeSpent = pastSpent + outSum
            
            const totalTickets = Math.floor(cumulativeSpent / 1000)
            const pastTickets = Math.floor(pastSpent / 1000)
            ticketsEarned = Math.max(0, totalTickets - pastTickets)
        } else {
            ticketsEarned = Math.floor(outSum / 1000)
        }
        
        // Award Tickets
        if (ticketsEarned > 0) {
            // Update local record
            await client.from('orders').update({ tickets_earned: ticketsEarned }).eq('id', orderId)
            
            // Add tickets to contest system
            if (clientId) {
                await addTickets(clientId, ticketsEarned, 'purchase_reward', String(orderId), false) // false = send notification
            }
        }

        // Prepare Admin Notification
        const itemsText = standardizedItems.map(it => 
            `- ${it.name || 'Товар'} x${it.quantity || 1} (${(it.price || 0) * (it.quantity || 1)} руб.)`
        ).join('\n');

        const adminMessage = [
            `✅ Оплата прошла успешно!`,
            `📦 Заказ #${orderId}`,
            `💰 Сумма: ${outSum} руб.`,
            `👤 Клиент: ${name || 'Не указано'}`,
            `🆔 ID клиента: ${clientId || 'Не указано'}`,
            `📞 Телефон: ${phone || 'Не указано'}`,
            `📧 Email: ${email || 'Не указано'}`,
            `📍 Адрес: ${address || 'Не указано'}`,
            `🎟 Билетов начислено: ${ticketsEarned}`,
            `📝 Товары:`,
            itemsText
        ].join('\n');

        // Send to Admin
        await sendTelegramMessage(adminMessage)

        // Prepare User Notification (KonkursEtraBot style)
        if (clientId && /^\d+$/.test(String(clientId))) {
            const remainder = cumulativeSpent % 1000
            const neededForNext = 1000 - remainder
            
            const userMessageLines = [
                `Спасибо за покупку!`,
                `Сумма: ${outSum} руб`,
                `Общая сумма покупок: ${cumulativeSpent} руб`,
                ``
            ]

            if (ticketsEarned > 0) {
                 userMessageLines.push(`🎟 Вы получили билетов: ${ticketsEarned}!`)
                 userMessageLines.push(``)
            }

            userMessageLines.push(`До билета не хватило: ${neededForNext} руб`)
            userMessageLines.push(`Купи еще на ${neededForNext} руб, чтобы получить билет!`)
            userMessageLines.push(``)
            userMessageLines.push(`Билеты начисляются за каждые 1000 руб суммарных покупок.`)

            const userMessage = userMessageLines.join('\n')
            
            // Send to User
            await sendTelegramMessage(userMessage, String(clientId))
        }

        // Send to Google Sheets
        // We need to format data as expected by sendToGoogleSheet
        const googleSheetData = {
            id: orderId,
            total_amount: outSum,
            promo_code: promo,
            ref_code: ref,
            customer_info: {
                ...customer,
                user_id: clientId // Ensure user_id is passed
            },
            items: standardizedItems
        }

        console.log(`Sending order ${orderId} to Google Sheets...`)
        await sendToGoogleSheet(googleSheetData)
    }

    return true
}
