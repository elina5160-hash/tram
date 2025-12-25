import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const client = getServiceSupabaseClient();
    
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase client not initialized' 
      }, { status: 500 });
    }

    const { data, error } = await client
        .from('bot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      logs: data 
    });
  } catch (e) {
    return NextResponse.json({ 
      success: false, 
      error: String(e) 
    }, { status: 500 });
  }
}
