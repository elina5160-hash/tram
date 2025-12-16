import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"

export async function GET() {
  const results = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Missing",
    },
    serviceClient: false,
    publicClient: false,
    insertTest: "Pending"
  }

  // 1. Try Service Client
  const serviceClient = getServiceSupabaseClient()
  results.serviceClient = !!serviceClient

  // 2. Try Public Client
  const publicClient = getSupabaseClient()
  results.publicClient = !!publicClient

  // 3. Try Insert (prefer Service, then Public)
  const client = serviceClient || publicClient
  
  if (!client) {
    return NextResponse.json({ ...results, error: "No Supabase client available" }, { status: 500 })
  }

  const testId = Math.floor(Date.now() / 1000)
  const currentTime = new Date().toISOString().split('T')[1].split('.')[0];
  
  // Realistic payload similar to cart
  const realisticItem = {
    name: "Закваска ПРАЭнзим",
    quantity: 1,
    cost: 3000,
    tax: "vat0",
    paymentMethod: "full_prepayment",
    paymentObject: "commodity"
  }

  const realisticCustomer = {
    name: "Test User",
    phone: "+79001234567",
    email: "test@example.com",
    address: "Test Address",
    cdek: "",
    client_id: 12345,
    order_time: new Date().toISOString()
  }

  try {
    const { data, error } = await client.from("orders").insert({
      id: testId,
      total_amount: 3000.00,
      items: [realisticItem],
      customer_info: realisticCustomer,
      promo_code: "TEST_PROMO",
      ref_code: "TEST_REF",
      status: 'pending',
      updated_at: currentTime
    }).select()

    if (error) {
      results.insertTest = `Failed: ${JSON.stringify(error)}`
    } else {
      results.insertTest = "Success"
      // Cleanup
      // await client.from("orders").delete().eq("id", testId)
    }
  } catch (e) {
    results.insertTest = `Exception: ${e}`
  }

  return NextResponse.json(results)
}
