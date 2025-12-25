import { NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const client = getServiceSupabaseClient()
    if (!client) {
      return NextResponse.json({ error: 'No Supabase service client' }, { status: 500 })
    }

    const { data: orders, error } = await client
      .from('orders')
      .select('id, customer_info, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        created_at: o.created_at,
        customer_info: o.customer_info
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
