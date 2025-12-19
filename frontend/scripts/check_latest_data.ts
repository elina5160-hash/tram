
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('--- Checking Latest Orders ---')
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching orders:', error)
  } else {
    console.log('Latest 5 orders:')
    orders.forEach(o => {
      console.log(`ID: ${o.id}, Status: ${o.status}, Amount: ${o.total_amount}, Created: ${o.created_at}`)
    })
  }

  console.log('\n--- Checking Bot Logs ---')
  const { data: logs, error: logsError } = await supabase
    .from('bot_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (logsError) {
    console.error('Error fetching logs:', logsError)
  } else {
    console.log('Latest 10 logs:')
    logs.forEach(l => {
      console.log(`[${l.created_at}] ${l.type}: ${l.message}`, l.data ? JSON.stringify(l.data).substring(0, 100) + '...' : '')
    })
  }
}

main()
