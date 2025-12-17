import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient, getSupabaseClient } from "@/lib/supabase"
import { addTickets } from "@/lib/contest"
import { sendTelegramMessage } from "@/lib/telegram"

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
    let client = getServiceSupabaseClient()
    if (!client) {
      client = getSupabaseClient()
    }
    if (!client) {
      try {
        const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '-1003590157576')
        const text = [`<b>Оплачен заказ № ${invId}</b>`, `Сумма: ${Number(outSum).toLocaleString('ru-RU')} руб.`].join('\n')
        await sendTelegramMessage(text, chatId)
      } catch {}
      return
    }
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
                const currentTime = new Date().toISOString()
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
                    total_qty: totalQty,
                    updated_at: currentTime
                })
                finalOrder = pending
                await client.from("pending_orders").delete().eq("id", Number(invId))
            }
        }
        if (finalOrder && finalOrder.status !== 'paid' && finalOrder.status !== 'Оплачен') {
            const currentTime2 = new Date().toISOString()
            await client.from("orders").update({ status: "Оплачен", ok: "true", updated_at: currentTime2 }).eq("id", Number(invId))
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
            try {
              const itemsArr = Array.isArray(finalOrder.items) ? finalOrder.items : []
              const lines = itemsArr.map((it: any) => {
                const name = String((it?.name ?? it?.title ?? 'Товар'))
                const qty = Number((it?.quantity ?? it?.qty ?? 1))
                const sum = Number(it?.sum ?? it?.cost ?? 0)
                return `• ${name} × ${qty} — ${sum.toLocaleString('ru-RU')} руб.`
              })
              const ci = finalOrder.customer_info || {}
              const name = String(ci?.name || '')
              const phone = String(ci?.phone || '')
              const email = String(ci?.email || '')
              const address = String(ci?.address || ci?.cdek || '')
              const clientId = ci?.client_id ? String(ci.client_id) : ''
              const promo = finalOrder.promo_code ? `Промокод: ${finalOrder.promo_code}` : ''
              const ref = finalOrder.ref_code ? `Реф-код: ${finalOrder.ref_code}` : ''
              const contactLines = [
                name ? `👤 ${name}` : '',
                phone ? `📞 <a href="tel:${phone}">${phone}</a>` : '',
                address ? `📍 ${address}` : '',
                email ? `✉️ <a href="mailto:${email}">${email}</a>` : '',
              ].filter(Boolean).join('\n')
              const text = [
                `<b>Оплачен заказ № ${invId}</b>`,
                `Сумма: ${Number(outSum).toLocaleString('ru-RU')} руб.`,
                lines.length ? `\n<b>Товары:</b>\n${lines.join('\n')}` : '',
                contactLines ? `\n<b>Пользователь</b>\n${contactLines}` : '',
                [promo, ref].filter(Boolean).length ? `\n${[promo, ref].filter(Boolean).join('\n')}` : '',
              ].filter(Boolean).join('\n')
              const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '-1003590157576')
              const replyMarkup = clientId ? { inline_keyboard: [[{ text: 'Написать в личные сообщения', url: `tg://user?id=${clientId}` }]] } : undefined
              await sendTelegramMessage(text, chatId, replyMarkup)
            } catch {}
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
  const password1 = process.env.ROBO_PASSWORD1 || process.env.NEXT_PUBLIC_ROBO_MERCHANT_LOGIN ? process.env.ROBO_PASSWORD1 || "" : ""
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST || ""
  if (!outSum || !invId || !signature) return NextResponse.json({ error: "Bad params" }, { status: 400 })
  const ok2 = password2 ? verifySignature(outSum, invId, signature, password2) : false
  const ok1 = password1 ? verifySignature(outSum, invId, signature, password1) : false
  const ok1Test = isTest && password1Test ? verifySignature(outSum, invId, signature, password1Test) : false
  if (!ok2 && !ok1 && !ok1Test) return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  await processOrder(invId, outSum)
  return ack(invId)
}

export async function POST(req: Request) {
  const password2 = process.env.ROBO_PASSWORD2 || ""
  const password1 = process.env.ROBO_PASSWORD1 || ""
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST || ""
  let bodyText = ""
  try { bodyText = await req.text() } catch {}
  const params = new URLSearchParams(bodyText)
  const outSum = params.get("OutSum") || ""
  const invId = params.get("InvId") || ""
  const signature = params.get("SignatureValue") || ""
  if (!outSum || !invId || !signature) return NextResponse.json({ error: "Bad params" }, { status: 400 })
  const ok2 = password2 ? verifySignature(outSum, invId, signature, password2) : false
  const ok1 = password1 ? verifySignature(outSum, invId, signature, password1) : false
  const ok1Test = isTest && password1Test ? verifySignature(outSum, invId, signature, password1Test) : false
  if (!ok2 && !ok1 && !ok1Test) return NextResponse.json({ error: "Bad signature" }, { status: 400 })
  await processOrder(invId, outSum)
  return ack(invId)
}
