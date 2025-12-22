import { NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { orderId, clientId } = await req.json()
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const client = getServiceSupabaseClient()
    if (!client) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Check if order exists
    const { data: order, error } = await client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      // Order not found (webhook might be delayed)
      return NextResponse.json({ status: 'not_found' })
    }

    // If order exists, ensure client_id is set
    const currentInfo = order.customer_info || {}
    const currentClientId = currentInfo.client_id

    // If missing client_id, update it
    if ((!currentClientId || currentClientId === 'undefined' || currentClientId === 'null') && clientId) {
       const newInfo = { ...currentInfo, client_id: clientId }
       
       // Also update the main text if needed? 
       // The main text (items column) is a string, hard to patch. 
       // But customer_info json is what we use for logic.
       
       await client.from('orders').update({ customer_info: newInfo }).eq('id', orderId)
       return NextResponse.json({ status: 'linked', order: { ...order, customer_info: newInfo } })
    }

    return NextResponse.json({ status: 'ok', order })
  } catch (e) {
    console.error('Sync error:', e)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
