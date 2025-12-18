import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const svc = getServiceSupabaseClient()
    const client = svc || getSupabaseClient()
    if (!client) return NextResponse.json([])

    const { data, error } = await client
      .from("contest_participants")
      .select("*")
      .order("tickets", { ascending: false })
      .limit(500)

    if (error) {
      console.error("Error fetching contest participants:", error)
      return NextResponse.json([])
    }

    const participants = (data || []).map((p: any) => ({
      id: p.id,
      created_at: p.created_at,
      user_id: String(p.user_id),
      ticket_numbers: p.ticket_numbers || [],
      tickets: p.tickets || 0,
      status: p.tickets > 0 ? 'active' : 'registered',
      contact_info: {
        first_name: p.first_name,
        username: p.username,
      }
    }))

    return NextResponse.json(participants)
  } catch (e) {
    console.error("Exception in contest API:", e)
    return NextResponse.json([])
  }
}
