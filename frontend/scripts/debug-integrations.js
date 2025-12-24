
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwevBSpHdLKyj8MlM8rAPkSPlFRf-oCL_U0zNerFVkOerSCjDIy2WqbjPvyC0hBq1Oq0g/exec";

async function testTelegram() {
    console.log("Testing Telegram...");
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) {
        console.error("❌ Missing Telegram credentials");
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: TELEGRAM_ADMIN_ID,
        text: "🔔 TEST NOTIFICATION: Integration Debug Check"
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.ok) {
            console.log("✅ Telegram Message Sent Successfully");
        } else {
            console.error("❌ Telegram Failed:", data);
        }
    } catch (e) {
        console.error("❌ Telegram Exception:", e);
    }
}

async function testGoogleSheets() {
    console.log("Testing Google Sheets...");
    console.log("URL:", GOOGLE_SHEETS_WEBHOOK_URL);

    const payload = {
        values: [
            "TEST_ID",
            "DEBUG_USER",
            "https://example.com",
            "debug_user",
            "https://t.me/debug",
            "Debug Name",
            new Date().toLocaleString("ru-RU"),
            "100",
            "Test Item",
            "TEST_PROMO",
            "PAID",
            "",
            "Debug Address",
            "Debug Comment",
            "",
            "",
            "",
            "",
            "",
            "1"
        ]
    };

    try {
        const res = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: "follow"
        });
        
        const text = await res.text();
        console.log("Google Sheets Response Status:", res.status);
        console.log("Google Sheets Response Body:", text);
        
        if (res.ok || res.status === 302) {
             console.log("✅ Google Sheets Request Likely Successful");
        } else {
             console.error("❌ Google Sheets Failed");
        }
    } catch (e) {
        console.error("❌ Google Sheets Exception:", e);
    }
}

async function run() {
    await testTelegram();
    await testGoogleSheets();
}

run();
