
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debug() {
  const targetId = '1287944066'
  console.log(`Searching for orders with client_id: ${targetId}`)

  // 1. Fetch exact match
  const { data: exact, error: exactError } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_info->>client_id', targetId)
  
  if (exactError) console.error('Exact error:', exactError)
  console.log(`Found ${exact?.length || 0} orders (exact match)`)
  if (exact?.length) {
      console.log('First order:', JSON.stringify(exact[0].customer_info, null, 2))
  }

  // 2. Fetch all and filter in JS (to see if there's a type mismatch)
  const { data: all, error: allError } = await supabase
    .from('orders')
    .select('*')
    .limit(50)
    .order('created_at', { ascending: false })

  if (allError) console.error('All error:', allError)
  
  if (all) {
      const manualFilter = all.filter(o => {
          const cId = o.customer_info?.client_id
          return String(cId) === targetId
      })
      console.log(`Found ${manualFilter.length} orders (manual filter)`)
      if (manualFilter.length > 0 && exact?.length === 0) {
          console.log('MISMATCH DETECTED! DB value:', manualFilter[0].customer_info?.client_id)
      }
  }
}

debug()
