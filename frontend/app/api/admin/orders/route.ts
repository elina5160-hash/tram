import { NextResponse } from "next/server"
import { listOrders } from "@/lib/orders"
import { getServiceSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    // Fetch paid and pending orders via centralized logic
    const { data: paidOrders } = await listOrders({ status: ["Оплачен", "paid"], limit: 200 })
    const { data: pendingOrders } = await listOrders({ status: ["created", "pending", "processing"], limit: 200 })

    // Combine and sort
    const combined = [...(paidOrders || []), ...(pendingOrders || [])].sort((a: any, b: any) => {
      const ta = new Date(a.created_at || 0).getTime()
      const tb = new Date(b.created_at || 0).getTime()
      return tb - ta
    })
    
    // Remove duplicates if any (though unlikely with different status filters)
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())

    // Calculate total revenue (all time)
    let totalRevenue = 0
    const client = getServiceSupabaseClient()
    if (client) {
        const { data: revenueData } = await client
            .from('orders')
            .select('total_amount')
            .in('status', ['Оплачен', 'paid'])
        
        if (revenueData) {
            totalRevenue = revenueData.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
        }
    }

    return NextResponse.json({
        orders: unique,
        stats: {
            totalRevenue
        }
    })
  } catch (e) {
    console.error('Admin API Error:', e)
    return NextResponse.json({ orders: [], stats: { totalRevenue: 0 } }, { status: 500 })
  }
}
