import { getServiceSupabaseClient } from './supabase'

export async function addTickets(userId: number | string, amount: number, reason: string, relatedId?: string) {
    const supabase = getServiceSupabaseClient()
    if (!supabase) return

    try {
        // 1. Get current tickets
        const { data: user, error } = await supabase.from('contest_participants').select('*').eq('user_id', userId).single()
        
        if (error || !user) {
            console.log(`User ${userId} not found in contest_participants, skipping ticket award.`)
            // Option: Create user here if critical, but they need a unique promo code.
            return
        }

        // 2. Update
        await supabase.from('contest_participants').update({ tickets: (user.tickets || 0) + amount }).eq('user_id', userId)

        // 3. Log
        await supabase.from('contest_tickets_log').insert({
            user_id: userId,
            amount,
            reason,
            related_id: relatedId
        })
        
        // 4. Notify via Bot (Optional, requires Bot API call or separate service)
        // Since this runs in Next.js, we can't easily access the running Bot instance.
        // We could use a simple fetch to Telegram API to send a message.
        if (process.env.TELEGRAM_BOT_TOKEN) {
             const token = process.env.TELEGRAM_BOT_TOKEN
             const msg = `🎉 Вам начислено +${amount} билетов! (Причина: ${formatReason(reason)})`
             try {
                 await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                     method: 'POST',
                     headers: {'Content-Type': 'application/json'},
                     body: JSON.stringify({ chat_id: userId, text: msg })
                 })
             } catch (e) {
                 console.error("Failed to send notification", e)
             }
        }

    } catch (e) {
        console.error("Error in addTickets", e)
    }
}

function formatReason(r: string) {
    if (r === 'purchase_reward') return 'Покупка'
    if (r === 'friend_purchase_promo') return 'Покупка друга по промокоду'
    if (r === 'referral_purchase_bonus') return 'Покупка приглашенного друга'
    return r
}
