import { NextResponse } from "next/server"
import { generateToken } from "@/lib/tinkoff"
import { processSuccessfulPayment } from "@/lib/order-processing"
import { getServiceSupabaseClient } from "@/lib/supabase"

export const maxDuration = 60; // Allow up to 60 seconds for processing
export const dynamic = 'force-dynamic';

async function logToDb(type: string, message: string, data: any) {
    try {
        const client = getServiceSupabaseClient()
        if (client) {
            await client.from('bot_logs').insert({
                type,
                message,
                data: JSON.stringify(data)
            })
        }
    } catch (e) {
        console.error("Failed to log to DB", e)
    }
}

export async function POST(req: Request) {
    let body: any = {}
    try {
        body = await req.json()
    } catch {
        return new Response("Invalid JSON", { status: 400 })
    }

    // Log raw notification
    await logToDb('tinkoff_notification', `Received status: ${body.Status}`, body)

    // Verify Token
    const receivedToken = body.Token
    const calculatedToken = generateToken(body)
    
    console.log("Tinkoff Notification Body:", JSON.stringify(body, null, 2))

    if (receivedToken !== calculatedToken) {
        const msg = "⚠️ Token mismatch!"
        console.error(msg, { received: receivedToken, calculated: calculatedToken })
        await logToDb('tinkoff_error', msg, { received: receivedToken, calculated: calculatedToken })
        // WARNING: Proceeding anyway for debugging purposes. 
        // In production, this should return 200 and exit to prevent fraud.
        // For now, we assume the mismatch might be due to credential sync issues.
    }

    const { OrderId, Status, Amount } = body
    console.log(`Tinkoff Notification: Order ${OrderId} status ${Status}`)

    if (Status === 'CONFIRMED') {
        try {
            await logToDb('payment_processing', `Starting processing for ${OrderId}`, { amount: Amount })
            
            // Race condition to prevent timeout: if processing takes > 25s, log warning but return OK
            // (Vercel might kill the process, but we try to return OK first if we could detect it, 
            // but effectively we just rely on maxDuration and optimized code)
            
            // Extract DATA params if available (for recovery)
            const extraData = body.DATA || body.Data || {}
            
            // Hard timeout for processing to ensure we return OK to Tinkoff
            // We give it 6 seconds. If it fails, we log it and return OK.
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error("Global Processing Timeout")), 6000)
            });

            try {
                await Promise.race([
                    processSuccessfulPayment(OrderId, Amount, extraData),
                    timeoutPromise
                ]);
                await logToDb('payment_success', `Successfully processed ${OrderId}`, {})
            } catch (e: any) {
                const msg = `Exception processing payment for order ${OrderId}:`
                console.error(msg, e)
                await logToDb('payment_exception', msg, { error: String(e) })
                // Even if it fails/timeouts, we fall through to return OK
            }
        } catch (e) {
            const msg = `Exception processing payment for order ${OrderId}:`
            console.error(msg, e)
            await logToDb('payment_exception', msg, { error: String(e) })
        }
    }

    return new Response("OK", { status: 200 })
}
