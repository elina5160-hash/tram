
import { NextResponse } from "next/server"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const client = getServiceSupabaseClient() || getSupabaseClient()
    if (!client) {
        return NextResponse.json({ error: "DB not available" }, { status: 500 })
    }

    const { data, error } = await client
        .from('orders')
        .select('*')
        .not('promo_code', 'is', null)
        .neq('promo_code', '')
        .in('status', ['paid', 'Оплачен', 'completed'])
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
