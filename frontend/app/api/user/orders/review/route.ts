import { NextResponse } from 'next/server'
import { submitOrderReview } from '@/lib/orders'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { order_id, rating, text } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Valid rating (1-5) is required' }, { status: 400 })
    }

    const result = await submitOrderReview(order_id, rating, text || '')

    return NextResponse.json({ success: true, order: result })
  } catch (e: any) {
    console.error('Review submission error:', e)
    return NextResponse.json({ error: e.message || 'Failed to submit review' }, { status: 500 })
  }
}
