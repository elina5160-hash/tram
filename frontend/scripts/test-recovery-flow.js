
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Mocks and Configs
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendTelegram(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
        console.log("❌ Telegram credentials missing");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text })
    });
    console.log("✅ Telegram sent");
}

async function sendSheet(data) {
    if (!GOOGLE_SHEETS_WEBHOOK_URL) {
        console.log("❌ Sheet URL missing");
        return;
    }
    
    // Construct payload matching the Google Script expectation
    const payload = {
        values: [
            data.id,
            "RECOVERY_USER",
            "",
            "recovery_user",
            "",
            "Recovery Mode",
            new Date().toLocaleString("ru-RU"),
            data.total_amount,
            "Восстановленный заказ",
            "",
            "PAID",
            "",
            "Recovery Description",
            "Recovery Ref",
            "",
            "",
            "",
            "",
            "",
            "1"
        ]
    };

    const res = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow'
    });
    console.log("✅ Sheet sent, status:", res.status);
}

async function runRecovery() {
    const orderId = Math.floor(Date.now() / 1000);
    const amount = 500; // 500 RUB

    console.log(`🚀 Starting Recovery Simulation for Order ${orderId}`);

    // 1. Simulate "Check if order exists"
    const { data: existing } = await client.from('orders').select('status').eq('id', orderId).single();
    
    if (!existing) {
        console.log("Order not found. Creating recovery...");
        const { error } = await client.from('orders').insert({
            id: orderId,
            total_amount: amount,
            status: 'paid',
            currency: 'RUB',
            items: 'Восстановлен из уведомления об оплате',
            customer_info: {
                description: 'Recovered from payment notification',
                is_recovery: true
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error("❌ Failed to create recovery order:", error);
            return;
        }
        console.log("✅ Recovery order created in Supabase");
    }

    // 2. Notifications
    await sendTelegram(`⚠️ ЗАКАЗ ВОССТАНОВЛЕН #${orderId}\nСумма: ${amount} руб.`);
    
    await sendSheet({
        id: orderId,
        total_amount: amount
    });
}

runRecovery();
