import { NextResponse } from 'next/server'
import { listOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('client_id')
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50
    const status = searchParams.get('status')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    const orders = await listOrders({
      client_id: clientId,
      limit: limit,
      status: status || undefined
    })

    return NextResponse.json(orders)
  } catch (e: any) {
    console.error('Fetch user orders error:', e)
    return NextResponse.json({ error: e.message || 'Failed to fetch orders' }, { status: 500 })
  }
}
