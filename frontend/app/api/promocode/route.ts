import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const { code } = await req.json()
    
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const upperCode = code.toUpperCase();

    // Temporary hardcode for START10 until migration is run
    if (upperCode === 'START10') {
        return NextResponse.json({ 
            valid: true, 
            type: 'percent', 
            value: 10,
            partner_name: 'General'
        })
    }

    const client = getSupabaseClient()
    if (!client) {
        // Fallback if Supabase is not configured yet (should not happen in prod)
        return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const { data, error } = await client
      .from('promo_codes')
      .select('*')
      .eq('code', upperCode)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ valid: false, message: "Promocode not found or inactive" }, { status: 404 })
    }

    return NextResponse.json({ 
      valid: true, 
      type: data.discount_type, 
      value: data.value,
      partner: data.partner_name
    })

  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
