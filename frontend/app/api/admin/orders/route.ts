import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const svc = getServiceSupabaseClient()
    const client = svc || getSupabaseClient()
    if (!client) return NextResponse.json([])

    const paidRes = await client
      .from("orders")
      .select("id,created_at,paid_at,total_amount,status,customer_info,promo_code,ref_code")
      .in("status", ["Оплачен", "paid"]) 
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200)

    const pendingRes = await client
      .from("orders")
      .select("id,created_at,updated_at,total_amount,status,customer_info,promo_code,ref_code")
      .not("status", "in", ["Оплачен", "paid"])
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200)

    const paid = Array.isArray(paidRes.data) ? paidRes.data : []
    const pending = Array.isArray(pendingRes.data) ? pendingRes.data.map((o: any) => ({
      id: o.id,
      created_at: o.created_at,
      paid_at: null,
      total_amount: o.total_amount,
      status: o.status || 'pending',
      customer_info: o.customer_info,
      promo_code: o.promo_code,
      ref_code: o.ref_code,
    })) : []

    const combined = [...paid, ...pending].sort((a: any, b: any) => {
      const ta = new Date(a.paid_at || a.created_at || 0).getTime()
      const tb = new Date(b.paid_at || b.created_at || 0).getTime()
      return tb - ta
    })

    return NextResponse.json(combined)
  } catch {
    return NextResponse.json([])
  }
}
