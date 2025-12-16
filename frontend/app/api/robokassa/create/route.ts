import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

export async function POST(req: Request) {
  const merchant = process.env.ROBO_MERCHANT_LOGIN?.trim()
  const password1Raw = process.env.ROBO_PASSWORD1?.trim()
  const isTest = process.env.ROBO_IS_TEST === "1"
  const password1Test = process.env.ROBO_PASSWORD1_TEST?.trim()

  const password1ToUse = isTest ? password1Test : password1Raw

  if (!merchant || !password1ToUse) {
    return NextResponse.json({ error: "Missing Robokassa credentials" }, { status: 500 })
  }
  
  let body: { 
    outSum?: number; 
    description?: string; 
    email?: string; 
    customerInfo?: any;
    promoCode?: string; 
    refCode?: string;
    items?: any[];
    invId?: number;
  } = {}
  
  try {
    body = await req.json()
  } catch {}
  
  const outSum = typeof body.outSum === "number" ? body.outSum : 0
  if (!outSum || outSum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }
  
  const description = body.description || "Оплата заказа"
  const email = body.email || ""
  // Use provided invId if valid number, else generate new one
  const invId = body.invId && typeof body.invId === "number" ? body.invId : Math.floor(Date.now() / 1000)
  
  // Сохраняем заказ в Supabase (если настроены переменные окружения)
  // Пытаемся использовать Service Client, если нет - обычный
  let client = getServiceSupabaseClient()
  if (!client) {
    client = getSupabaseClient()
  }

  if (client) {
    // Получаем текущее время в формате HH:mm:ss для поля updated_at (тип time)
    const currentTime = new Date().toISOString().split('T')[1].split('.')[0];

    // Сохраняем заказ в таблицу pending_orders (черновики)
    // Только оплаченные заказы попадут в основную таблицу orders
    // P.S. Если таблицы pending_orders нет, пробуем сохранить в orders как fallback, чтобы оплата не сломалась
    try {
      const { error } = await client.from("pending_orders").insert({
        id: invId,
        total_amount: outSum,
        items: body.items || [],
        customer_info: body.customerInfo || { email },
        promo_code: body.promoCode,
        ref_code: body.refCode,
        status: 'pending',
        currency: 'RUB',
        updated_at: currentTime
      })
      
      if (error) throw error
    } catch (e) {
      console.error("Error saving to pending_orders:", e)
      // Не пишем в orders на этапе создания — только после подтверждения оплаты
    }
  } else {
      const missingVars = []
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push("NEXT_PUBLIC_SUPABASE_URL")
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push("SUPABASE_SERVICE_ROLE_KEY")
      
      console.error("Supabase client not initialized. Missing: " + missingVars.join(", "))
      // Продолжаем без записи в БД, чтобы не блокировать оплату
  }

  const out = outSum.toFixed(2)

  const shp: Record<string, string> = {}
  if (body.promoCode) shp.Shp_promo = body.promoCode.trim()
  if (body.refCode) shp.Shp_ref = body.refCode.trim()

  const sortedKeys = Object.keys(shp).sort()
  const shpString = sortedKeys.map((k) => `${k}=${shp[k]}`).join(":")

  const base = [merchant, out, String(invId), password1ToUse].join(":")
  const signatureBase = base
  const hashAlg = (process.env.ROBO_HASH_ALG || "MD5").toUpperCase()
  const signatureHex = hashAlg === "SHA256"
    ? crypto.createHash("sha256").update(signatureBase, "utf8").digest("hex")
    : crypto.createHash("md5").update(signatureBase, "utf8").digest("hex")
  const signature = signatureHex.toLowerCase()
  
  console.log(`[Robokassa] Base: ${signatureBase}`)
  console.log(`[Robokassa] Signature: ${signature}`)

  const params = new URLSearchParams()
  params.set("MerchantLogin", merchant)
  params.set("OutSum", out)
  params.set("InvId", String(invId))
  params.set("Description", description)
  params.set("SignatureValue", signature)
  
  // Добавляем фискализацию (Receipt), если есть товары
  if (body.items && body.items.length > 0) {
    try {
      let receiptItems = body.items.map((it: any) => ({
        name: it.name || "Товар",
        quantity: it.quantity || 1,
        sum: (it.cost || 0) * (it.quantity || 1), // Сумма строки = цена * количество
        tax: it.tax || "none",
        payment_method: it.paymentMethod || "full_prepayment",
        payment_object: it.paymentObject || "commodity"
      }))

      // Проверяем сходимость сумм (важно для Robokassa)
      const totalItemsSum = receiptItems.reduce((acc: number, it: any) => acc + it.sum, 0)
      
      // Если сумма товаров отличается от суммы к оплате (например, скидка), корректируем цены
      if (totalItemsSum > 0 && Math.abs(totalItemsSum - outSum) > 0.01) {
        const coefficient = outSum / totalItemsSum
        let currentSum = 0
        
        receiptItems = receiptItems.map((it: any, index: number) => {
           if (index === receiptItems.length - 1) {
             // Последнему элементу отдаем остаток, чтобы сумма сошлась копейка в копейку
             const newItemSum = Number((outSum - currentSum).toFixed(2))
             // Force quantity 1 to ensure exact match if needed, but for now just update sum
             // Robokassa requires sum to be item_price * quantity.
             // If we change sum, we imply price change.
             return { ...it, sum: newItemSum }
           } else {
             const newItemSum = Number((it.sum * coefficient).toFixed(2))
             currentSum += newItemSum
             return { ...it, sum: newItemSum }
           }
        })
      } else if (totalItemsSum === 0 && outSum > 0) {
          // Fallback if items sum is 0 (e.g. missing costs) but outSum is positive
          // Distribute outSum evenly or just to the first item?
          // This shouldn't happen with correct frontend, but just in case.
          console.warn("Total items sum is 0 but OutSum is positive. Fixing receipt.")
          if (receiptItems.length > 0) {
              const perItem = Number((outSum / receiptItems.length).toFixed(2))
              let current = 0
              receiptItems = receiptItems.map((it: any, index: number) => {
                  if (index === receiptItems.length - 1) {
                      return { ...it, sum: Number((outSum - current).toFixed(2)) }
                  }
                  current += perItem
                  return { ...it, sum: perItem }
              })
          }
      }

      const receipt = {
        items: receiptItems
      }
      
      // Receipt нужно передавать как URL-encoded JSON
      params.set("Receipt", JSON.stringify(receipt))
    } catch (e) {
      console.error("Error creating receipt:", e)
    }
  }
  
  if (email) params.set("Email", email)
  sortedKeys.forEach((k) => params.set(k, shp[k]))
  if (isTest) params.set("IsTest", "1")
  
  params.set("Culture", "ru")
  
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
  return NextResponse.json({ url, invId })
}
