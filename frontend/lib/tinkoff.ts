import crypto from "node:crypto"

// Credentials
// Prioritize environment variables, fallback to hardcoded (as currently in production)
const TERMINAL_KEY = process.env.TINKOFF_TERMINAL_KEY || "1765992881356"
const PASSWORD = process.env.TINKOFF_PASSWORD || "ejlk$s_nR!5rZTPR"
const API_URL = process.env.TINKOFF_API_URL || "https://securepay.tinkoff.ru/v2"

export function getTinkoffCredentials() {
    return { TERMINAL_KEY, PASSWORD, API_URL }
}

export function generateToken(params: Record<string, any>) {
    // 1. Add Password to params
    const paramsWithPwd: Record<string, any> = { ...params, Password: PASSWORD }
    
    // 2. Filter out Token and unwanted keys, sort alphabetically
    const keys = Object.keys(paramsWithPwd)
        .filter(k => k !== "Token" && k !== "Receipt" && k !== "DATA")
        .sort()
    
    // 3. Concatenate values
    let str = ""
    for (const k of keys) {
        if (paramsWithPwd[k] !== undefined && paramsWithPwd[k] !== null && paramsWithPwd[k] !== "") {
            str += paramsWithPwd[k]
        }
    }
    
    // 4. Hash SHA-256
    return crypto.createHash("sha256").update(str).digest("hex")
}

export async function checkPaymentStatus(orderId: string | number) {
    const params = {
        TerminalKey: TERMINAL_KEY,
        OrderId: String(orderId),
    }

    const token = generateToken(params)
    const body = { ...params, Token: token }

    try {
        const res = await fetch(`${API_URL}/GetState`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            throw new Error(`Tinkoff API error: ${res.status} ${res.statusText}`)
        }

        const data = await res.json()
        return data // Returns { Success, Status, PaymentId, Amount, ... }
    } catch (e) {
        console.error("Error checking Tinkoff payment status:", e)
        return null
    }
}
