import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient } from "@/lib/supabase"

function verifySignature(outSum: string, invId: string, signature: string, password2: string) {
  const base = `${outSum}:${invId}:${password2}`
  const calc = crypto.createHash("md5").update(base, "utf8").digest("hex").toLowerCase()
  return calc === String(signature || "").toLowerCase()
}

function ack(invId: string) {
  return NextResponse.text(`OK${invId}`)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const outSum = url.searchParams.get("OutSum") || ""
  const invId = url.searchParams.get("InvId") || ""
  const signature = url.searchParams.get("SignatureValue") || ""
  const password2 = process.env.ROBO_PASSWORD2 || ""
  if (!password2) return NextResponse.json({ error: "Missing password2" }, { status: 500 })
  if (!outSum || !invId || !signature) return NextResponse.json({ error: "Bad params" }, { status: 400 })
  if (!verifySignature(outSum, invId, signature, password2)) return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  try {
    const client = getSupabaseClient()
    if (client) {
      await client.from("orders").update({ status: "paid" }).eq("id", Number(invId))
    }
  } catch {}
  return ack(invId)
}

export async function POST(req: Request) {
  const password2 = process.env.ROBO_PASSWORD2 || ""
  if (!password2) return NextResponse.json({ error: "Missing password2" }, { status: 500 })
  let bodyText = ""
  try { bodyText = await req.text() } catch {}
  const params = new URLSearchParams(bodyText)
  const outSum = params.get("OutSum") || ""
  const invId = params.get("InvId") || ""
  const signature = params.get("SignatureValue") || ""
  if (!outSum || !invId || !signature) return NextResponse.json({ error: "Bad params" }, { status: 400 })
  if (!verifySignature(outSum, invId, signature, password2)) return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  try {
    const client = getSupabaseClient()
    if (client) {
      await client.from("orders").update({ status: "paid" }).eq("id", Number(invId))
    }
  } catch {}
  return ack(invId)
}

