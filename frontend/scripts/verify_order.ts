import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('Verifying order #682530359...')

  // 1. Check Order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', 682530359)
    .maybeSingle()

  if (error) {
    console.error('Error fetching order:', error)
  } else if (!order) {
    console.error('Order NOT found!')
  } else {
    console.log('✅ Order FOUND:', order)
  }

  // 2. Search for User by Email to get Client ID
  console.log('\nSearching for user vvzhavor@yandex.ru...')
  
  // Check in orders (maybe they have previous orders)
  const { data: ordersWithEmail } = await supabase
    .from('orders')
    .select('customer_info')
    .ilike('customer_info->>email', 'vvzhavor@yandex.ru')

  let foundClientId = null

  if (ordersWithEmail && ordersWithEmail.length > 0) {
      console.log(`Found ${ordersWithEmail.length} orders with this email.`)
      for (const o of ordersWithEmail) {
          const info = typeof o.customer_info === 'string' ? JSON.parse(o.customer_info) : o.customer_info
          if (info.client_id) {
              foundClientId = info.client_id
              console.log('Found client_id from past order:', foundClientId)
              break
          }
      }
  }

  if (!foundClientId) {
      console.log('No client_id found in orders.')
  } else {
      // Check if user exists in contest_participants
      const { data: participant } = await supabase
        .from('contest_participants')
        .select('*')
        .eq('user_id', String(foundClientId))
        .maybeSingle()
      
      if (participant) {
          console.log('✅ User found in contest_participants:', participant)
      } else {
          console.log('⚠️ User has client_id but NOT in contest_participants.')
      }
  }
}

main()
