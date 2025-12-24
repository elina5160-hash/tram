
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Mock fetch for node environment if needed (Next.js polyfills it, but node script might need it)
// But node 18+ has fetch. Let's assume environment is modern enough.

async function check() {
    // Need to bypass the TS compilation or use ts-node.
    // Easier to just reimplement the check here quickly to avoid transpilation issues.
    
    const crypto = require("crypto");
    const TERMINAL_KEY = process.env.TINKOFF_TERMINAL_KEY || "1765992881356";
    const PASSWORD = process.env.TINKOFF_PASSWORD || "ejlk$s_nR!5rZTPR";
    const API_URL = process.env.TINKOFF_API_URL || "https://securepay.tinkoff.ru/v2";

    const orderId = "1766595130"; // The user's order

    const params = {
        TerminalKey: TERMINAL_KEY,
        OrderId: orderId,
        Password: PASSWORD
    };

    const keys = Object.keys(params).filter(k => k !== "Token").sort();
    let str = "";
    for (const k of keys) {
         str += params[k];
    }
    const token = crypto.createHash("sha256").update(str).digest("hex");

    const body = {
        TerminalKey: TERMINAL_KEY,
        OrderId: orderId,
        Token: token
    };

    console.log("Checking status for:", orderId);
    try {
        const res = await fetch(`${API_URL}/GetState`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log("Tinkoff Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

check();
