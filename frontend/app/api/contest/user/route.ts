import { NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = getServiceSupabaseClient()
    if (!supabase) {
        return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    try {
        const { data, error } = await supabase
            .from('contest_participants')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json(data)
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
