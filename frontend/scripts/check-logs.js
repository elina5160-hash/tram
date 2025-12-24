
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLogs() {
    console.log("Checking bot_logs...");
    const { data, error } = await client
        .from('bot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching logs:", error);
    } else {
        console.log("Latest Logs:");
        console.log(JSON.stringify(data, null, 2));
    }
}

checkLogs();
