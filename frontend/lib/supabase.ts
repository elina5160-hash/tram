import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials")
    return null
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseKey)
  return supabaseInstance
}

export function getServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase Service credentials")
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function checkDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
  const client = getServiceSupabaseClient() || getSupabaseClient()
  if (!client) {
    return { success: false, error: 'No Supabase client initialized (missing credentials)' }
  }

  try {
    // Simple query to check connection
    const { error } = await client.from('orders').select('id').limit(1)
    if (error) {
      return { success: false, error: `Connection failed: ${error.message}` }
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: `Unexpected connection error: ${e}` }
  }
}
