import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    type Payload = { type?: string; message?: string; data?: unknown }
    let payload: Payload | null = null
    try { payload = await req.json() } catch {}
    const type = (payload && payload.type) || "UNKNOWN"
    const message = (payload && payload.message) || ""
    const data = (payload && payload.data) || null
    console.log("metric", { type, message, data, ts: Date.now() })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
