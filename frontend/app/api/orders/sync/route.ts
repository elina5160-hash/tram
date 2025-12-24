import { NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'
import { addTickets } from '@/lib/contest'
import { checkPaymentStatus } from '@/lib/tinkoff'
import { processSuccessfulPayment } from '@/lib/order-processing'

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
    let { data: order, error } = await client
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
       
       const { error: updateError } = await client.from('orders').update({ customer_info: newInfo }).eq('id', orderId)
       if (!updateError) {
           order.customer_info = newInfo // Update local object
       }
    }

    // CHECK PAYMENT STATUS WITH TINKOFF IF NOT PAID
    if (order.status !== 'paid' && order.status !== 'Оплачен') {
        try {
            console.log(`Checking Tinkoff status for order ${orderId}...`)
            const paymentId = order.customer_info?.payment_id
            const tinkoffState = await checkPaymentStatus(orderId, paymentId)
            
            if (tinkoffState && tinkoffState.Status === 'CONFIRMED') {
                console.log(`Order ${orderId} confirmed by Tinkoff. Processing...`)
                const success = await processSuccessfulPayment(orderId, tinkoffState.Amount)
                if (success) {
                    // Refetch order to return updated status
                    const { data: updatedOrder } = await client.from('orders').select('*').eq('id', orderId).single()
                    if (updatedOrder) order = updatedOrder
                }
            } else if (tinkoffState) {
                console.log(`Order ${orderId} status is ${tinkoffState.Status}`)
            }
        } catch (e) {
            console.error("Failed to check Tinkoff status:", e)
        }
    }

    // Handle missed tickets if order is now paid (either was paid before, or just became paid)
    if (order.status === 'paid' || order.status === 'Оплачен') {
        // Only run this logic if we suspect tickets weren't awarded (e.g. tickets_earned is null/0 but amount > 1000)
        // OR if we just linked the client_id (which we did above)
        
        // We can just run the check safely.
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
           
           // Check if we need to update
           if (ticketsEarned > 0 && (!order.tickets_earned || order.tickets_earned < ticketsEarned)) {
               // Update order record
               await client.from('orders').update({ tickets_earned: ticketsEarned }).eq('id', orderId)
               
               // Award tickets to user
               // We pass true for 'skipIfTransactionExists' to avoid duplicates
               await addTickets(clientId, ticketsEarned, 'purchase_reward', String(orderId), true)
               
               // Update local object for response
               order.tickets_earned = ticketsEarned
           }
       } catch (e) {
           console.error("Error awarding tickets during sync:", e)
       }
    }

    return NextResponse.json({ status: 'ok', order })
  } catch (e) {
    console.error('Sync error:', e)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
