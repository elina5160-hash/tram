import { NextResponse } from "next/server"
import { listOrders } from "@/lib/orders"

export async function GET() {
  try {
    // Fetch paid and pending orders via centralized logic
    const paidOrders = await listOrders({ status: ["Оплачен", "paid"], limit: 200 })
    const pendingOrders = await listOrders({ status: ["created", "pending", "processing"], limit: 200 })

    // Combine and sort
    const combined = [...paidOrders, ...pendingOrders].sort((a: any, b: any) => {
      const ta = new Date(a.created_at || 0).getTime()
      const tb = new Date(b.created_at || 0).getTime()
      return tb - ta
    })
    
    // Remove duplicates if any (though unlikely with different status filters)
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())

    return NextResponse.json(unique)
  } catch (e) {
    console.error('Admin API Error:', e)
    return NextResponse.json([], { status: 500 })
  }
}
