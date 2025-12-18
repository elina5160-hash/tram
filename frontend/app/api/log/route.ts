import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const sup = getServiceSupabaseClient() || getSupabaseClient()
    if (sup) {
      await sup.from('bot_logs').insert({
        created_at: new Date().toISOString(),
        type: String(payload?.type || 'generic'),
        message: String(payload?.message || ''),
        data: payload?.data ?? {},
      })
    } else {
      console.log('[bot_log]', payload)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}

