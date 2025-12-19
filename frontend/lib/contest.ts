import { getServiceSupabaseClient } from './supabase'

export async function addTickets(userId: number | string, count: number, reason: string, relatedId?: string) {
    const supabase = getServiceSupabaseClient()
    if (!supabase) {
        console.error("addTickets: No service client available")
        return false
    }

    try {
        // 1. Get current participant
        const { data: user, error: fetchError } = await supabase.from('contest_participants').select('*').eq('user_id', String(userId)).single()
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching user for tickets:', fetchError)
            return false
        }
        
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
            const { error: updateError } = await supabase.from('contest_participants').update({ 
                ticket_numbers: updatedTickets,
                tickets: updatedTickets.length
            }).eq('user_id', String(userId))
            
            if (updateError) {
                console.error('Error updating tickets:', updateError)
                return false
            }
        } else {
            // Create new participant
            const { error: insertError } = await supabase.from('contest_participants').insert({
                user_id: String(userId),
                ticket_numbers: newTickets,
                tickets: newTickets.length,
                status: 'active',
                contact_info: {} // We might want to fill this later
            })
            
            if (insertError) {
                console.error('Error inserting participant:', insertError)
                return false
            }
        }

        // 4. Log
        await supabase.from('contest_tickets_log').insert({
            user_id: String(userId),
            amount: count,
            reason: reason,
            related_id: relatedId
        })

        // 5. Notify
        if (process.env.TELEGRAM_BOT_TOKEN && count > 0) {
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
        
        return true

    } catch (e) {
        console.error("Error in addTickets", e)
        return false
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
