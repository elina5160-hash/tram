import { NextResponse } from 'next/server'
import { requestOrderReturn } from '@/lib/orders'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { order_id, reason } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!reason) {
        return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const result = await requestOrderReturn(order_id, reason)

    return NextResponse.json({ success: true, order: result })
  } catch (e: any) {
    console.error('Return request error:', e)
    return NextResponse.json({ error: e.message || 'Failed to process return request' }, { status: 500 })
  }
}
