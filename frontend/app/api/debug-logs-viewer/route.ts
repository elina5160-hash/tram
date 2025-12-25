import { NextResponse } from 'next/server'
import { getServiceSupabaseClient, getSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let client = getServiceSupabaseClient()
    let type = 'service'
    
    if (!client) {
        client = getSupabaseClient()
        type = 'anon'
    }

    if (!client) {
        return NextResponse.json({ error: 'No Supabase client available' }, { status: 500 })
    }

    const { data, error } = await client
        .from('bot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        return NextResponse.json({ error: error.message, client: type }, { status: 500 })
    }

    return NextResponse.json({ 
        logs: data,
        client: type,
        env_check: {
            service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            url: !!process.env.NEXT_PUBLIC_SUPABASE_URL
        }
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
