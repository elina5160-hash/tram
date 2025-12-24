
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    const invId = Math.floor(Date.now() / 1000);
    const outSum = 20;
    const description = "Test Order Debug";
    const itemsText = "- Test Item x1 (20 rub)";
    const itemsBackup = [{
        name: "Test Item",
        quantity: 1,
        price: 20,
        sum: 20
    }];

    const payload = {
        id: invId,
        total_amount: outSum,
        currency: "RUB",
        // description: description, // REMOVED
        items: itemsText, 
        customer_info: {
            name: "Debug User",
            email: "debug@example.com",
            items_backup: itemsBackup,
            description: description // Moved inside JSON
        },
        promo_code: "",
        ref_code: "DEBUG_RUN",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    console.log("Attempting to insert order:", invId);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const { data, error } = await client.from("orders").insert(payload).select();

    if (error) {
        console.error("❌ Insert failed:", error);
    } else {
        console.log("✅ Insert successful:", data);
    }
}

testInsert();
