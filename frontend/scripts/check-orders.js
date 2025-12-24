
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrders() {
    console.log("Checking recent orders...");
    const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log("Recent Orders:");
        console.log(JSON.stringify(data, null, 2));
    }
}

checkOrders();
