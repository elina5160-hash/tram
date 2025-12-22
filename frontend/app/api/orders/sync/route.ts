import { NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'
import { addTickets } from '@/lib/contest'

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
       
       await client.from('orders').update({ customer_info: newInfo }).eq('id', orderId)
       
       // Handle missed tickets if order is already paid
       if (order.status === 'paid' || order.status === 'Оплачен') {
           try {
               // Calculate tickets (Cumulative Logic)
               const { data: pastOrders } = await client
                   .from('orders')
                   .select('total_amount')
                   .eq('customer_info->>client_id', clientId)
                   .neq('id', orderId)
                   .in('status', ['paid', 'Оплачен'])

               const pastSpent = pastOrders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0
               const currentAmount = Number(order.total_amount) || 0
               const cumulativeSpent = pastSpent + currentAmount

               const totalTicketsFromSpend = Math.floor(cumulativeSpent / 1000)
               const pastTicketsFromSpend = Math.floor(pastSpent / 1000)

               const ticketsEarned = Math.max(0, totalTicketsFromSpend - pastTicketsFromSpend)
               
               if (ticketsEarned > 0) {
                   // Update order record
                   await client.from('orders').update({ tickets_earned: ticketsEarned }).eq('id', orderId)
                   
                   // Award tickets to user
                   await addTickets(clientId, ticketsEarned, 'purchase_reward', String(orderId), true)
               }
           } catch (e) {
               console.error("Error awarding tickets during sync:", e)
           }
       }

       return NextResponse.json({ status: 'linked', order: { ...order, customer_info: newInfo } })
    }

    return NextResponse.json({ status: 'ok', order })
  } catch (e) {
    console.error('Sync error:', e)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
