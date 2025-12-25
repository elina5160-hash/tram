
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrder() {
  const orderId = 1766672925
  console.log(`Checking order ${orderId}...`)
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
    
  if (error) {
    console.error('Error fetching order:', error)
    return
  }
  
  console.log('Order found!')
  console.log('Customer Info:', JSON.stringify(data.customer_info, null, 2))
  console.log('Client ID type:', typeof data.customer_info.client_id)
  console.log('Client ID value:', data.customer_info.client_id)
}

checkOrder()
