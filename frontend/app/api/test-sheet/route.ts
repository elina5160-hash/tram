import { NextResponse } from "next/server"
import { sendToGoogleSheet } from "@/lib/google-sheets"

export async function GET() {
  const dummyOrder = {
    id: Math.floor(Date.now() / 1000),
    total_amount: 999,
    items: "- Тестовый товар x1 (999 руб.)",
    customer_info: {
      name: "Тестовый Пользователь",
      email: "test@example.com",
      phone: "+79001234567",
      address: "г. Москва, ул. Тестовая, д. 1",
      items_backup: [
        {
            id: 123,
            name: "Тестовый товар",
            quantity: 1,
            price: 999,
            sum: 999
        }
      ]
    },
    promo_code: "TEST",
    ref_code: "REF123",
    status: "pending"
  }

  try {
    const result = await sendToGoogleSheet(dummyOrder)
    return NextResponse.json({ success: true, message: "Sent to Google Sheet", result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
