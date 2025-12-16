import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, message, data } = body;
    
    // Log to server console (visible in Vercel logs)
    console.log(`[CLIENT_LOG] [${type || 'INFO'}] ${message}`, data ? JSON.stringify(data) : '');
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
