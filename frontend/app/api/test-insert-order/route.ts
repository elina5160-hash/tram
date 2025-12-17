import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"
import { addTickets } from "@/lib/contest"

export async function GET() {
  const client = getSupabaseClient()
  const hasClient = !!client

  const testOrder = {
    id: Date.now(),
    total_amount: 4200,
    items: [
      { id: 6, title: "Набор СЕЗОННЫЙ", qty: 1, price: 4200 },
    ],
    customer_info: {
      email: "ania.volckova2015@mail.ru",
      name: "Волкова Анна Александровна",
      phone: "+79001234567", 
      address: "г Глазов Пехтина 22",
      client_id: 123456789,
      order_time: new Date().toISOString()
    },
    status: "test_completed",
    promo_code: "",
    ref_code: ""
  }

  let data: unknown = null
  let error: any = null
  if (hasClient) {
    const currentTime = new Date().toISOString().split('T')[1].split('.')[0]
    const res = await client!.from("orders").insert({ ...testOrder, updated_at: currentTime }).select()
    data = res.data
    error = res.error
    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }
  }

  // --- TRIGGER CONTEST TICKETS ---
  // Simulate logic from robokassa/result
  const tickets = Math.floor(testOrder.total_amount / 1000) // 4 tickets
  if (hasClient && testOrder.customer_info.client_id) {
    await addTickets(testOrder.customer_info.client_id, tickets, 'purchase_reward', String(testOrder.id))
  }

  // Send Telegram Notification
  const lines = [`• Набор СЕЗОННЫЙ × 1 — 4200 руб.`]
  const contact = [
    `👤 ${testOrder.customer_info.name}`,
    `📞 <a href="tel:${'+79001234567'}">${'+79001234567'}</a>`,
    `📍 ${testOrder.customer_info.address}`,
    `✉️ <a href="mailto:${testOrder.customer_info.email}">${testOrder.customer_info.email}</a>`,
  ].join('\n')
  const msg = [
    `<b>Оплачен заказ № ${testOrder.id}</b>`,
    `Сумма: ${testOrder.total_amount} руб.`,
    `\n<b>Товары:</b>`,
    lines.join('\n'),
    `\n<b>Пользователь</b>`,
    contact,
    `\nНачислено билетов: ${tickets}`,
  ].join('\n')

  const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '-1003590157576')
  const clientId = String(testOrder.customer_info.client_id)
  const replyMarkup = clientId ? { inline_keyboard: [[{ text: 'Написать в личные сообщения', url: `tg://user?id=${clientId}` }]] } : undefined
  await sendTelegramMessage(msg, chatId, replyMarkup)

  return NextResponse.json({ success: true, data, telegram_sent: true, tickets_awarded: tickets, db_skipped: !hasClient })
}
