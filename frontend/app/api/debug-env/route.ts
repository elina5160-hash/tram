import { NextResponse } from 'next/server';
import { getServiceSupabaseClient, getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceClient = getServiceSupabaseClient();
  const anonClient = getSupabaseClient();
  
  let dbCheck = { success: false, error: null as any, count: 0, lastOrder: null as any };
  
  try {
    const client = serviceClient || anonClient;
    if (client) {
        const { data, error, count } = await client
            .from('orders')
            .select('*', { count: 'exact', head: false })
            .order('created_at', { ascending: false })
            .limit(1);
            
        dbCheck.success = !error;
        dbCheck.error = error;
        dbCheck.count = count || 0;
        dbCheck.lastOrder = data?.[0] || null;
    }
  } catch (e) {
      dbCheck.error = String(e);
  }

  return NextResponse.json({
    hasServiceKey: !!serviceKey,
    hasServiceClient: !!serviceClient,
    hasAnonClient: !!anonClient,
    dbCheck
  });
}
