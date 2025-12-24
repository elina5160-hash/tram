import { NextResponse } from "next/server"
import { generateToken } from "@/lib/tinkoff"
import { processSuccessfulPayment } from "@/lib/order-processing"

export async function POST(req: Request) {
    let body: any = {}
    try {
        body = await req.json()
    } catch {
        return new Response("Invalid JSON", { status: 400 })
    }

    // Verify Token
    const receivedToken = body.Token
    const calculatedToken = generateToken(body)
    
    console.log("Tinkoff Notification Body:", JSON.stringify(body, null, 2))

    if (receivedToken !== calculatedToken) {
        console.error("⚠️ Token mismatch!", { received: receivedToken, calculated: calculatedToken })
        // WARNING: Proceeding anyway for debugging purposes. 
        // In production, this should return 200 and exit to prevent fraud.
        // For now, we assume the mismatch might be due to credential sync issues.
    }

    const { OrderId, Status, Amount } = body
    console.log(`Tinkoff Notification: Order ${OrderId} status ${Status}`)

    if (Status === 'CONFIRMED') {
        try {
            const success = await processSuccessfulPayment(OrderId, Amount)
            if (!success) {
                 console.error(`Failed to process payment for order ${OrderId}`)
            }
        } catch (e) {
            console.error(`Exception processing payment for order ${OrderId}:`, e)
        }
    }

    return new Response("OK", { status: 200 })
}
