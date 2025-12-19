import { NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'
import { isSubscribedToOfficial } from '@/lib/telegram'
import { addTickets } from '@/lib/contest'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId || userId === 'null' || userId === 'undefined') {
        return NextResponse.json({ error: 'Valid User ID is required' }, { status: 400 })
    }

    // Validate that userId is numeric (bigint safe)
    if (!/^\d+$/.test(userId)) {
         return NextResponse.json({ error: 'User ID must be numeric' }, { status: 400 })
    }

    const supabase = getServiceSupabaseClient()
    if (!supabase) {
        return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    try {
        // Check subscription and award ticket if needed
        const subscribed = await isSubscribedToOfficial(userId)
        if (subscribed) {
            const { data: log } = await supabase
                .from('contest_tickets_log')
                .select('id')
                .eq('user_id', userId)
                .eq('reason', 'channel_subscription')
                .single()
            
            if (!log) {
                await addTickets(userId, 1, 'channel_subscription')
            }
        }

        const { data, error } = await supabase
            .from('contest_participants')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()

        if (error) {
            console.error("Database error fetching user:", error)
            return NextResponse.json({ error: 'Database error: ' + error.message }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ error: 'User not found in participants table' }, { status: 404 })
        }

        return NextResponse.json(data)
    } catch (e) {
        console.error("Error in contest/user:", e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
