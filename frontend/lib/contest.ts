import { getServiceSupabaseClient } from './supabase'

export async function addTickets(userId: number | string, count: number, reason: string, relatedId?: string) {
    const supabase = getServiceSupabaseClient()
    if (!supabase) return

    try {
        // 1. Get current participant
        const { data: user, error } = await supabase.from('contest_participants').select('*').eq('user_id', String(userId)).single()
        
        // If user doesn't exist, we should create them? 
        // For now, if they are not in the contest table, we might create them or skip.
        // Let's assume we create them if they don't exist, so they get their tickets.
        let currentTickets: string[] = []
        if (user) {
            currentTickets = user.ticket_numbers || []
        }

        // 2. Generate new tickets
        const newTickets: string[] = []
        for (let i = 0; i < count; i++) {
            newTickets.push(generateTicket())
        }

        // 3. Update or Insert
        if (user) {
            const updatedTickets = [...currentTickets, ...newTickets]
            await supabase.from('contest_participants').update({ 
                ticket_numbers: updatedTickets,
                tickets: updatedTickets.length
            }).eq('user_id', String(userId))
        } else {
            // Create new participant
            await supabase.from('contest_participants').insert({
                user_id: String(userId),
                ticket_numbers: newTickets,
                tickets: newTickets.length,
                status: 'active',
                contact_info: {} // We might want to fill this later
            })
        }

        // 4. Log (Optional)
        // await supabase.from('contest_tickets_log').insert(...)

        // 5. Notify
        if (process.env.TELEGRAM_BOT_TOKEN) {
             const token = process.env.TELEGRAM_BOT_TOKEN
             const msg = `🎉 Вам начислено ${count} билетов! Ваши номера: ${newTickets.join(', ')}`
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

function generateTicket() {
    // Generate 6-digit random number
    return Math.floor(100000 + Math.random() * 900000).toString()
}

function formatReason(r: string) {
    if (r === 'purchase_reward') return 'Покупка'
    if (r === 'friend_purchase_promo') return 'Покупка друга по промокоду'
    if (r === 'referral_purchase_bonus') return 'Покупка приглашенного друга'
    return r
}
