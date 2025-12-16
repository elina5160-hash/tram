import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getServiceSupabaseClient } from "@/lib/supabase"
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

async function processOrder(invId: string, outSum: string) {
    const client = getServiceSupabaseClient()
    if (!client) return

    try {
        // 1. Проверяем, есть ли уже заказ в таблице orders (чтобы не дублировать)
        const { data: existingOrder } = await client.from("orders").select('id, status').eq("id", Number(invId)).single()
        
        if (existingOrder) {
            console.log(`Order ${invId} already exists in orders table with status ${existingOrder.status}`)
            // Если он там есть, значит уже оплачен (или мы его туда перенесли).
            // Но на всякий случай обновим статус, если он вдруг не оплачен (хотя по логике он там только оплаченный)
            if (existingOrder.status !== 'paid' && existingOrder.status !== 'Оплачен') {
                await client.from("orders").update({ status: "Оплачен", ok: "true" }).eq("id", Number(invId))
            }
            return
        }

        // 2. Если нет в orders, ищем в pending_orders
        const { data: pendingOrder } = await client.from("pending_orders").select('*').eq("id", Number(invId)).single()
        
        if (!pendingOrder) {
            console.error(`Order ${invId} not found in pending_orders`)
            return
        }

        // 3. Переносим в orders
        const { error: insertError } = await client.from("orders").insert({
            id: pendingOrder.id,
            total_amount: pendingOrder.total_amount,
            items: pendingOrder.items,
            customer_info: pendingOrder.customer_info,
            promo_code: pendingOrder.promo_code,
            ref_code: pendingOrder.ref_code,
            status: "Оплачен",
            ok: "true",
            updated_at: pendingOrder.updated_at || new Date().toISOString().split('T')[1].split('.')[0]
        })

        if (insertError) {
             console.error(`Failed to move order ${invId} to orders table:`, insertError)
             return
        }
        
        // Используем данные из pendingOrder для дальнейшей логики
        const order = { ...pendingOrder, status: "Оплачен" }

        // --- TELEGRAM NOTIFICATION ---
             const customer = order.customer_info || {}
             const itemsList = (order.items || []).map((i: any) => `- ${i.name} x${i.quantity || i.qty || 1}`).join('\n')
             
             const message = `
<b>💰 Новый заказ оплачен!</b>

<b>ID заказа:</b> ${invId}
<b>Сумма:</b> ${outSum} руб.
<b>Покупатель:</b> ${customer.name || 'Не указано'}
<b>Телефон:</b> ${customer.phone || 'Не указано'}
<b>Email:</b> ${customer.email || 'Не указано'}
<b>Адрес:</b> ${customer.address || 'Не указано'}

<b>Товары:</b>
${itemsList}
`
             await sendTelegramMessage(message, "-5037927554")

             // --- CONTEST LOGIC ---
             const amount = Number(outSum)
             const tickets = Math.floor(amount / 1000)
             // Check client_id in customer_info (jsonb)
             const clientId = order.customer_info?.client_id
             
             // 1. Buyer Tickets
             if (tickets > 0 && clientId) {
                 await addTickets(clientId, tickets, 'purchase_reward', invId)
             }
             
             // 2. Promo Code Referrer (Method 3: +2 tickets)
             const promoCode = order.promo_code
             if (promoCode) {
                 const { data: owner } = await client.from('contest_participants').select('user_id').eq('personal_promo_code', promoCode).single()
                 // Prevent self-referral bonus if they used their own code (if allowed)
                 if (owner && String(owner.user_id) !== String(clientId)) {
                     await addTickets(owner.user_id, 2, 'friend_purchase_promo', invId)
                 }
             }
             
             // 3. Referral Link Bonus (Method 2 Bonus: +1 ticket)
             if (clientId) {
                 const { data: referral } = await client.from('contest_referrals').select('referrer_id').eq('referee_id', clientId).single()
                 if (referral) {
                      await addTickets(referral.referrer_id, 1, 'referral_purchase_bonus', invId)
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
