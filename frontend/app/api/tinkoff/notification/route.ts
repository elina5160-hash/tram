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
    
    if (receivedToken !== calculatedToken) {
        console.error("Token mismatch", { received: receivedToken, calculated: calculatedToken, body })
        // Return OK to acknowledge receipt, but log error
        return new Response("OK", { status: 200 })
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
