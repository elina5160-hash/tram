import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"
import { addTickets } from "@/lib/contest"

export async function GET() {
  const client = getSupabaseClient()
  if (!client) {
    return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 })
  }

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

  // Insert into Supabase
  const { data, error } = await client.from("orders").insert(testOrder).select()

  if (error) {
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  // --- TRIGGER CONTEST TICKETS ---
  // Simulate logic from robokassa/result
  const tickets = Math.floor(testOrder.total_amount / 1000) // 4 tickets
  if (testOrder.customer_info.client_id) {
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

  await sendTelegramMessage(msg)

  return NextResponse.json({ success: true, data, telegram_sent: true, tickets_awarded: tickets })
}
