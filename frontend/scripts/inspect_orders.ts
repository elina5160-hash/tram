
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), 'frontend/.env.local') })

async function inspect() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase Service credentials")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('Inspecting orders table...')
  
  // Try to select all columns for one row
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error selecting from orders:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Found row:', Object.keys(data[0]))
    // console.log('Full row data:', data[0])
  } else {
    console.log('Table is empty. Checking expected columns...')
    // If empty, we can't see columns easily without introspection which isn't always enabled via client
    // But we can try to select specific columns we expect and see if it errors
    const expectedCols = [
        'id', 'total_amount', 'items', 'customer_info', 
        'customer_name', 'customer_phone', 'customer_email', 
        'delivery_address', 'order_items_text', 
        'promo_code', 'ref_code', 'status', 'created_at', 'updated_at'
    ]
    
    // Check one by one or all? Let's check all first
    const { error: colError } = await supabase.from('orders').select(expectedCols.join(',')).limit(1)
    if (colError) {
        console.error('Column check error:', colError.message)
        // Check individually to see which one fails
        for (const col of expectedCols) {
            const { error: singleError } = await supabase.from('orders').select(col).limit(1)
            if (singleError) {
                console.error(`Column MISSING or error: ${col} - ${singleError.message}`)
            } else {
                console.log(`Column OK: ${col}`)
            }
        }
    } else {
        console.log('All expected columns exist!')
    }
  }
}

inspect()
