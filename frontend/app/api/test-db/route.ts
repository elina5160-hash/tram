import { NextResponse } from "next/server"
import { getSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase"
import { isSubscribedToOfficial } from "@/lib/telegram"
import { addTickets } from "@/lib/contest"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const debugSub = searchParams.get('debugSub')
  const tryAdd = searchParams.get('tryAdd')

  const results = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Missing",
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? "Set" : "Missing"
    },
    serviceClient: false,
    publicClient: false,
    insertTest: "Pending",
    subscriptionCheck: null as any,
    addTicketResult: null as any
  }

  // Try Add Ticket
  if (tryAdd && userId) {
      const res = await addTickets(userId, 1, 'debug_manual_add')
      results.addTicketResult = res
  }


  // Debug Subscription if requested
  if (debugSub && userId) {
      const token = process.env.TELEGRAM_BOT_TOKEN || ""
      const channel = '@etraproject_official'
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(channel)}&user_id=${userId}`)
        const data = await res.json()
        results.subscriptionCheck = {
            ok: res.ok,
            status: res.status,
            data: data
        }
      } catch (e) {
          results.subscriptionCheck = { error: String(e) }
      }
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

  // Check for participants
  const { data: participants, error: partError } = await client
    .from("contest_participants")
    .select("*")
    .limit(10)

  // Check logs
  const { data: logs, error: logError } = await client
    .from("contest_tickets_log")
    .select("*")
    .eq("user_id", userId || "")
    .limit(10)

  const checkResult = {
      participants: participants,
      partError: partError,
      logs: logs,
      logError: logError
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

  // Check for specific columns by trying to select them
  const checks: any = {}
  
  try {
    const { error: err1 } = await client.from('contest_participants').select('ticket_numbers').limit(1)
    checks.has_ticket_numbers = !err1
    checks.ticket_numbers_error = err1
  } catch (e) { checks.has_ticket_numbers = false }

  try {
    const { error: err2 } = await client.from('contest_participants').select('tickets').limit(1)
    checks.has_tickets = !err2
    checks.tickets_error = err2
  } catch (e) { checks.has_tickets = false }

  return NextResponse.json({ ...results, checkResult, schemaChecks: checks })
}
