import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"

function verifySignature(outSum: string, invId: string, signature: string, password2: string) {
  const base = `${outSum}:${invId}:${password2}`
  const calc = crypto.createHash("md5").update(base, "utf8").digest("hex").toLowerCase()
  return calc === String(signature || "").toLowerCase()
}

function ack(invId: string) {
  return new Response(`OK${invId}`)
}

function formatCustomerInfo(ci: unknown, emailFallback: string = "") {
  if (typeof ci === "string") return ci.trim()
  if (typeof ci === "object" && ci !== null) {
    const o = ci as Record<string, unknown>
    const name = typeof o.name === "string" ? o.name.trim() : ""
    const phone = typeof o.phone === "string" ? o.phone.trim() : ""
    const address = typeof o.address === "string" ? o.address.trim() : ""
    const cdek = typeof o.cdek === "string" ? o.cdek.trim() : ""
    const email = typeof o.email === "string" ? o.email.trim() : emailFallback
    const addr = address ? `${address} (курьер)` : (cdek ? `ПВЗ СДЭК: ${cdek}` : "")
    return [name, phone, addr, email].filter(Boolean).join("\n")
  }
  return emailFallback
}

async function processOrder(invId: string, outSum: string) {
    const client = getServiceSupabaseClient()
    if (!client) return
    try {
        const { data: order } = await client.from("orders").select('*').eq("id", Number(invId)).single()
        let finalOrder = order
        if (!finalOrder) {
            const { data: pending } = await client.from("pending_orders").select('*').eq("id", Number(invId)).single()
            if (pending) {
                const paidAt = new Date().toISOString()
                const items = pending.items || []
                const totalQty = Array.isArray(items) ? items.reduce((s: number, it: unknown) => {
                    if (typeof it === 'object' && it !== null) {
                        const obj = it as Record<string, unknown>
                        const q = obj.quantity ?? obj.qty
                        const qn = typeof q === 'number' ? q : Number(q || 0)
                        return s + (isNaN(qn as number) ? 0 : (qn as number))
                    }
                    return s
                }, 0) : 0
                await client.from("orders").insert({
                    id: Number(invId),
                    total_amount: Number(outSum),
                    items,
                    customer_info: formatCustomerInfo(pending.customer_info, ""),
                    promo_code: pending.promo_code,
                    ref_code: pending.ref_code,
                    status: "Оплачен",
                    ok: "true",
                    paid_at: paidAt,
                    total_qty: totalQty
                })
                finalOrder = pending
                await client.from("pending_orders").delete().eq("id", Number(invId))
            }
        }
        if (finalOrder && finalOrder.status !== 'paid' && finalOrder.status !== 'Оплачен') {
            await client.from("orders").update({ status: "Оплачен", ok: "true" }).eq("id", Number(invId))
            const amount = Number(outSum)
            const tickets = Math.floor(amount / 1000)
            const clientId = finalOrder.customer_info?.client_id
            if (tickets > 0 && clientId) {
                await addTickets(clientId, tickets, 'purchase_reward', invId)
            }
            const promoCode = finalOrder.promo_code
            if (promoCode) {
                const { data: owner } = await client.from('contest_participants').select('user_id').eq('personal_promo_code', promoCode).single()
                if (owner && String(owner.user_id) !== String(clientId)) {
                    await addTickets(owner.user_id, 2, 'friend_purchase_promo', invId)
                }
            }
            if (clientId) {
                const { data: referral } = await client.from('contest_referrals').select('referrer_id').eq('referee_id', clientId).single()
                if (referral) {
                    await addTickets(referral.referrer_id, 1, 'referral_purchase_bonus', invId)
                }
            }
        }
    } catch (e) {
        console.error("Error processing order", e)
    }
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
  
  await processOrder(invId, outSum)
  
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
  
  await processOrder(invId, outSum)
  
  return ack(invId)
}
