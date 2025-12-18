import { NextResponse } from "next/server"
export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      return NextResponse.json({ error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 })
    }

    type SendBody = { chat_id?: string; text?: string }
    let body: Partial<SendBody> = {}
    try {
      body = await req.json()
    } catch {}
    const chatId = body.chat_id || process.env.TELEGRAM_ADMIN_CHAT_ID
    const text = body.text

    if (!chatId || !text) {
      return NextResponse.json({ error: "chat_id and text required" }, { status: 400 })
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: 502 })
    }

    return NextResponse.json({ ok: true, result: data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
