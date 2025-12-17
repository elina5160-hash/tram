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
  const currentTime = new Date().toISOString();

  try {
    const { data, error } = await client.from("orders").insert({
      id: testId,
      total_amount: 1.00,
      items: [{ name: "Test Diagnostic", quantity: 1, cost: 1 }],
      customer_info: { email: "diagnostic@test.com", note: "Diagnostic Test" },
      promo_code: "DIAGNOSTIC",
      ref_code: "TEST",
      status: 'pending',
      updated_at: currentTime
    }).select()

    if (error) {
      results.insertTest = `Failed: ${JSON.stringify(error)}`
    } else {
      results.insertTest = "Success"
    }
  } catch (e) {
    results.insertTest = `Exception: ${e}`
  }

  return NextResponse.json(results)
}
