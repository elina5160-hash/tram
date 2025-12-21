import { getServiceSupabaseClient, getSupabaseClient } from "./supabase"
import { z } from "zod"

// Zod Schemas for Validation
const OrderItemSchema = z.object({
  id: z.number().optional(), // Product ID for repeat orders
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price cannot be negative"),
  sum: z.number().min(0, "Sum cannot be negative")
})

const CustomerInfoSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().optional(),
  cdek: z.string().optional(),
  client_id: z.string().optional().or(z.number().transform(String)).optional()
})

const CreateOrderSchema = z.object({
  id: z.number().int().positive("Order ID must be a positive integer"),
  total_amount: z.number().min(0, "Total amount cannot be negative"),
  items: z.array(OrderItemSchema),
  customer_info: CustomerInfoSchema,
  promo_code: z.string().optional(),
  ref_code: z.string().optional(),
  status: z.string().default("created"),
  tickets_earned: z.number().optional()
})

// Types inferred from Zod
export type OrderItem = z.infer<typeof OrderItemSchema>
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>
export type CreateOrderDTO = z.infer<typeof CreateOrderSchema>

const LOG_TABLE = 'bot_logs'
const ORDERS_TABLE = 'orders'

// Helper for reliable logging
async function logOrderOperation(operation: string, orderId: number | string, status: 'success' | 'error', details?: any) {
  try {
    const client = getServiceSupabaseClient() || getSupabaseClient()
    if (!client) {
      console.error('Supabase client unavailable for logging')
      return
    }

    await client.from(LOG_TABLE).insert({
      type: `order_${operation}`,
      message: `Order ${orderId} ${operation}: ${status}`,
      data: JSON.stringify(details || {})
    })
  } catch (e) {
    console.error('Failed to write to bot_logs:', e)
  }
}

// 1. Create/Upsert Order
export async function createOrder(data: CreateOrderDTO) {
  const client = getServiceSupabaseClient() || getSupabaseClient()
  if (!client) {
    throw new Error('Database connection failed')
  }

  // 1. Validation
  const validationResult = CreateOrderSchema.safeParse(data)
  if (!validationResult.success) {
    const errors = (validationResult as any).error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
    await logOrderOperation('create_validation', data.id || 'unknown', 'error', { errors, data })
    throw new Error(`Validation failed: ${errors}`)
  }
  
  const validData = validationResult.data

  // 2. Generate Full Text Representation
  const itemsList = validData.items.map(it => 
    `- ${it.name} x${it.quantity} (${it.sum} руб.)`
  ).join('\n')

  const fullText = [
    `📦 ЗАКАЗ #${validData.id}`,
    `💰 Сумма: ${validData.total_amount} руб.`,
    `👤 Клиент: ${validData.customer_info.name || 'Не указано'}`,
    `🆔 ID клиента: ${validData.customer_info.client_id || 'Не указано'}`,
    `📧 Email: ${validData.customer_info.email || 'Не указано'}`,
    `📍 Адрес: ${validData.customer_info.address || validData.customer_info.cdek || 'Не указано'}`,
    ``,
    `🛒 Товары:`,
    itemsList,
    ``,
    `🎁 Конкурс:`,
    `Начислено билетов: ${validData.tickets_earned ?? 0}`
  ].join('\n')

  const dbPayload = {
    id: validData.id,
    total_amount: validData.total_amount,
    items: fullText, // Storing text instead of JSON array
    customer_info: {
        ...validData.customer_info,
        items_backup: validData.items // Backup structured items for "Repeat Order" functionality
    },
    
    // Flat columns (optional, kept for compatibility if they exist)
    customer_name: validData.customer_info.name || '',
    customer_phone: validData.customer_info.phone || '',
    customer_email: validData.customer_info.email || '',
    delivery_address: validData.customer_info.address || validData.customer_info.cdek || '',
    order_items_text: itemsList, // Short text summary
    
    promo_code: validData.promo_code || null,
    ref_code: validData.ref_code || null,
    status: validData.status,
    updated_at: new Date().toISOString()
  }

  // 3. Database Operation
  const { data: result, error } = await client
    .from(ORDERS_TABLE)
    .upsert(dbPayload)
    .select()
    .single()

  if (error) {
    await logOrderOperation('create', validData.id, 'error', { error, payload: dbPayload })
    throw new Error(`Failed to create order: ${error.message}`)
  }

  await logOrderOperation('create', validData.id, 'success', { id: validData.id })
  return result
}

// 2. Get Order
export async function getOrder(id: number) {
  const client = getServiceSupabaseClient() || getSupabaseClient()
  if (!client) throw new Error('Database connection failed')

  const { data, error } = await client
    .from(ORDERS_TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    await logOrderOperation('read', id, 'error', { error })
    // Don't throw if just not found, return null
    return null
  }
  
  return data
}

// 3. Update Status
export async function updateOrderStatus(id: number, status: string) {
  const client = getServiceSupabaseClient() || getSupabaseClient()
  if (!client) throw new Error('Database connection failed')

  const { data, error } = await client
    .from(ORDERS_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logOrderOperation('update_status', id, 'error', { error, status })
    throw new Error(`Failed to update status: ${error.message}`)
  }

  await logOrderOperation('update_status', id, 'success', { status })
  return data
}

// 4. Archive (Soft delete or status change)
export async function archiveOrder(id: number) {
  return updateOrderStatus(id, 'archived')
}

// 5. Request Return
export async function requestOrderReturn(id: number, reason: string) {
  const client = getServiceSupabaseClient() || getSupabaseClient()
  if (!client) throw new Error('Database connection failed')

  // 1. Update status to return_requested
  // We also append the reason to the internal logs or we could store it in a separate table
  // For now, we'll log it and update the status.
  
  const { data, error } = await client
    .from(ORDERS_TABLE)
    .update({ 
        status: 'return_requested',
        updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    await logOrderOperation('return_request', id, 'error', { error, reason })
    throw new Error(`Failed to request return: ${error.message}`)
  }

  await logOrderOperation('return_request', id, 'success', { reason })
  return data
}

// 6. Submit Review
export async function submitOrderReview(id: number, rating: number, text: string) {
    const client = getServiceSupabaseClient() || getSupabaseClient()
    if (!client) throw new Error('Database connection failed')

    // Get current order to preserve customer_info
    const { data: order, error: fetchError } = await client
        .from(ORDERS_TABLE)
        .select('customer_info')
        .eq('id', id)
        .single()
    
    if (fetchError || !order) {
        throw new Error('Order not found')
    }

    const updatedInfo = {
        ...order.customer_info,
        review: {
            rating,
            text,
            date: new Date().toISOString()
        }
    }

    const { data, error } = await client
        .from(ORDERS_TABLE)
        .update({ 
            customer_info: updatedInfo,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        await logOrderOperation('submit_review', id, 'error', { error, rating, text })
        throw new Error(`Failed to submit review: ${error.message}`)
    }

    await logOrderOperation('submit_review', id, 'success', { rating })
    return data
}

// 7. List Orders (Admin & User)
export async function listOrders(options: { 
  limit?: number; 
  offset?: number;
  status?: string | string[]; 
  client_id?: string;
  search?: string;
} = {}) {
  const client = getServiceSupabaseClient() || getSupabaseClient()
  if (!client) throw new Error('Database connection failed')

  let query = client
    .from(ORDERS_TABLE)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    
  if (options.limit) {
    const from = options.offset || 0
    const to = from + options.limit - 1
    query = query.range(from, to)
  }
  
  if (options.status) {
    if (Array.isArray(options.status)) {
       query = query.in('status', options.status)
    } else {
       query = query.eq('status', options.status)
    }
  }

  // Filter by client_id inside the JSONB column customer_info
  if (options.client_id) {
    // We use the arrow operator ->> to get the value as text
    query = query.eq('customer_info->>client_id', options.client_id)
  }

  if (options.search) {
      const term = options.search
      if (/^\d+$/.test(term)) {
          // If numeric, search ID or items
          query = query.or(`id.eq.${term},items.ilike.%${term}%`)
      } else {
          query = query.ilike('items', `%${term}%`)
      }
  }

  const { data, error, count } = await query

  if (error) {
    await logOrderOperation('list', 'all', 'error', { error, options })
    throw new Error(`Failed to list orders: ${error.message}`)
  }

  return { data: data || [], count }
}

