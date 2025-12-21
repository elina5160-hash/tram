import { NextResponse } from 'next/server'
import { listOrders } from '@/lib/orders'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('client_id')
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0
    const status = searchParams.get('status')
    const search = searchParams.get('search') || undefined

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    const result = await listOrders({
      client_id: clientId,
      limit,
      offset,
      status: status || undefined,
      search
    })

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Fetch user orders error:', e)
    return NextResponse.json({ error: e.message || 'Failed to fetch orders' }, { status: 500 })
  }
}
