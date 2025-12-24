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
        // Return OK to prevent retries if it's a permanent error? Or 400?
        // Usually return 200 OK to stop bank from retrying if we can't process it.
        // But if it's a security check, we should return 200 'OK' string but log it.
        return new Response("OK", { status: 200 })
    }

    const { OrderId, Status, Amount } = body

    if (Status === 'CONFIRMED') {
        const success = await processSuccessfulPayment(OrderId, Amount)
        if (success) {
            return new Response("OK", { status: 200 })
        } else {
             // If processing failed, maybe retry?
             return new Response("Processing Failed", { status: 500 })
        }
    }

    return new Response("OK", { status: 200 })
}
