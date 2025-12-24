
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

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
        // description: description, // Commented out as per route.ts
        items: itemsText, 
        customer_info: {
            name: "Debug User",
            email: "debug@example.com",
            items_backup: itemsBackup,
            description: description,
            client_id: "123456789"
        },
        promo_code: "",
        ref_code: "DEBUG_RUN",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    console.log("Attempting to insert order:", invId);
    
    const { data, error } = await client.from("orders").insert(payload).select();

    if (error) {
        console.error("❌ Insert failed:", error);
    } else {
        console.log("✅ Insert successful:", data);
    }
}

testInsert();
