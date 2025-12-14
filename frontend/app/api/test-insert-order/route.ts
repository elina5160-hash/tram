import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

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
      phone: "+79001234567", // Placeholder as user didn't provide specific phone in this prompt
      address: "г Глазов Пехтина 22",
      client_id: 123456789, // Mock Telegram ID
      order_time: new Date().toISOString()
    },
    status: "test_completed",
    promo_code: "",
    ref_code: ""
  }

  const { data, error } = await client.from("orders").insert(testOrder).select()

  if (error) {
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
