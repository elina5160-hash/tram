import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const client = getSupabaseClient()
    if (!client) return NextResponse.json([])
    const { data, error } = await client
      .from("orders")
      .select("id,created_at,paid_at,total_amount,status,customer_info,promo_code,ref_code")
      .in("status", ["Оплачен", "paid"]) 
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) return NextResponse.json([], { status: 200 })
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch {
    return NextResponse.json([])
  }
}

