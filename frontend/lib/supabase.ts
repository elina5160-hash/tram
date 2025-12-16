import { createClient } from '@supabase/supabase-js'

let supabaseInstance: any = null

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials:", { 
      url: !!supabaseUrl, 
      anonKey: !!supabaseKey 
    })
    return null
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseKey)
  return supabaseInstance
}

export function getServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error("Service Role Key missing or URL missing:", {
      url: !!supabaseUrl,
      serviceKey: !!supabaseKey
    })
    return null
  }
  return createClient(supabaseUrl, supabaseKey)
}
