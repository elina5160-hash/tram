import { NextResponse } from 'next/server'
import { listOrders } from '@/lib/orders'
import { getServiceSupabaseClient } from '@/lib/supabase'

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

    const serviceClient = getServiceSupabaseClient()
    const usedServiceKey = !!serviceClient

    console.log(`[USER_ORDERS_API] Fetching orders for clientId: '${clientId}'. ServiceKey: ${usedServiceKey}`)

    // Fetch recent 200 orders without filtering by ID in SQL, 
    // to handle corrupted/inconsistent customer_info formats (strings, weird objects, etc.)
    const { data: allOrders } = await listOrders({
      limit: 200,
      offset: 0,
      status: status || undefined,
      search
    })

    // Robust matching logic
    const filteredOrders = (allOrders || []).map(order => {
        // Try to normalize customer_info
        let info = order.customer_info
        
        // Helper to recursively parse
        const parse = (inp: any): any => {
            if (!inp) return {}
            if (typeof inp === 'string') {
                try {
                    const p = JSON.parse(inp)
                    return parse(p)
                } catch { return {} }
            }
            // Handle "weird object" (spread string)
            if (typeof inp === 'object' && inp !== null && '0' in inp && '1' in inp) {
                try {
                    const len = Object.keys(inp).length
                    let s = ""
                    for(let i=0; i<len; i++) s += inp[String(i)] || ""
                    // If it looks like JSON, parse it
                    if (s.startsWith('{') || s.startsWith('[')) return parse(s)
                    return inp
                } catch { return inp }
            }
            return inp
        }

        const cleanInfo = parse(info)
        return { ...order, customer_info: cleanInfo }
    }).filter(order => {
        const info = order.customer_info
        if (!info) return false
        
        // Check all possible ID fields
         const ids = [
             info.client_id, 
             info.user_id, 
             info.telegram_id, 
             info.id
         ].map(String).filter(Boolean)

         return ids.includes(String(clientId))
     })

     // Debugging the first order to see how it was parsed
     const debugFirstOrder = allOrders && allOrders.length > 0 ? {
        original: allOrders[0].customer_info,
        parsed: filteredOrders.length > 0 ? filteredOrders[0].customer_info : 'Not matched'
     } : null

     return NextResponse.json({
         data: filteredOrders,
         count: filteredOrders.length,
         debug: {
             clientId,
             usedServiceKey,
             hasEnv: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
             fetchedTotal: allOrders?.length || 0,
             filteredTotal: filteredOrders.length,
             sampleParse: debugFirstOrder
         }
     })
  } catch (e: any) {
    console.error('Fetch user orders error:', e)
    return NextResponse.json({ error: e.message || 'Failed to fetch orders' }, { status: 500 })
  }
}
