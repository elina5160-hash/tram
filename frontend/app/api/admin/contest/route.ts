import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const client = getServiceSupabaseClient();
  if (!client) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  
  const { data, error } = await client.from('contest_participants').select('*').order('created_at', { ascending: false });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json(data);
}
