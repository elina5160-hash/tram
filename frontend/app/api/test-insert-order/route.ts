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
  const msg = `
📦 <b>ТЕСТОВЫЙ ЗАКАЗ #${testOrder.id}</b>
💰 Сумма: <b>${testOrder.total_amount} руб.</b>
👤 Клиент: ${testOrder.customer_info.name}
🆔 ID клиента: ${testOrder.customer_info.client_id}
📧 Email: ${testOrder.customer_info.email}
📍 Адрес: ${testOrder.customer_info.address}

🛒 <b>Товары:</b>
- Набор СЕЗОННЫЙ x1 (4200 руб.)

🎁 <b>Конкурс:</b>
Начислено билетов: ${tickets}
  `.trim()

  const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '-1003590157576')
  await sendTelegramMessage(msg, chatId)

  return NextResponse.json({ success: true, data, telegram_sent: true, tickets_awarded: tickets, db_skipped: !hasClient })
}
