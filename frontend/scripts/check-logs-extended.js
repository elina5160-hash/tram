
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLogsMore() {
    console.log("Checking bot_logs...");
    const { data, error } = await client
        .from('bot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Get more logs

    if (error) {
        console.error("Error fetching logs:", error);
    } else {
        console.log("Logs:");
        // Filter for order creation or interesting events
        const relevant = data.filter(l => l.type.includes('create') || l.type.includes('order') || l.type.includes('tinkoff'));
        console.log(JSON.stringify(relevant, null, 2));
    }
}

checkLogsMore();
