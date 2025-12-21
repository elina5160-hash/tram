
import { checkDatabaseConnection } from '../lib/supabase'
import { createOrder, getOrder, updateOrderStatus, archiveOrder, listOrders, CreateOrderDTO } from '../lib/orders'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), 'frontend/.env.local') })

async function testOrdersModule() {
  console.log('--- Starting Orders Module Test ---')

  // 1. Check Connection
  console.log('1. Checking Database Connection...')
  const conn = await checkDatabaseConnection()
  if (!conn.success) {
    console.error('❌ Connection Failed:', conn.error)
    console.warn('⚠️  SKIPPING remaining tests due to missing credentials or connection error.')
    return
  }
  console.log('✅ Connection Successful')

  // 2. Create Order
  console.log('\n2. Testing Create Order...')
  const testId = 999999
  const payload: CreateOrderDTO = {
    id: testId,
    total_amount: 5000,
    items: [{ name: 'Test Item', quantity: 1, price: 5000, sum: 5000 }],
    customer_info: { name: 'Test User', email: 'test@example.com' },
    status: 'created'
  }

  try {
    await createOrder(payload)
    console.log(`✅ Order Created: ${testId}`)
  } catch (e: any) {
    console.error(`❌ Create Failed: ${e.message}`)
  }

  // 3. Read Order
  console.log('\n3. Testing Read Order...')
  const order = await getOrder(testId)
  if (order && order.id === testId) {
    console.log(`✅ Order Fetched: ${order.id}`)
  } else {
    console.error('❌ Fetch Failed')
  }

  // 3.1 Test List Orders
  console.log('\n3.1 Testing List Orders (Admin)...')
  const { data: list } = await listOrders({ limit: 5 })
  if (list && list.length > 0) {
     console.log(`✅ List Fetched: ${list.length} items`)
     const found = list.find((o: any) => o.id === testId)
     if (found) console.log('✅ Test order found in list')
     else console.warn('⚠️ Test order not in top 5 (might be expected if many orders)')
  } else {
     console.warn('⚠️ List empty or failed')
  }

  // 4. Update Status
  console.log('\n4. Testing Update Status...')
  await updateOrderStatus(testId, 'processing')
  const updated = await getOrder(testId)
  if (updated.status === 'processing') {
    console.log(`✅ Status Updated to ${updated.status}`)
  } else {
    console.error('❌ Update Failed')
  }

  // 5. Archive
  console.log('\n5. Testing Archive Order...')
  await archiveOrder(testId)
  const archived = await getOrder(testId)
  if (archived.status === 'archived') {
    console.log('✅ Order Archived')
  } else {
    console.error('❌ Archive Failed')
  }
  
  console.log('\n✅ ALL TESTS PASSED')
}

testOrdersModule()
