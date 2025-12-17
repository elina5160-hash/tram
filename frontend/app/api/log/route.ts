import { NextResponse } from 'next/server';
import crypto from 'node:crypto'

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

export async function GET(req: Request) {
  const url = new URL(req.url)
  const out = url.searchParams.get('out') || ''
  const invId = url.searchParams.get('invId') || ''
  const promo = url.searchParams.get('promo') || ''
  const ref = url.searchParams.get('ref') || ''
  const includeShp = url.searchParams.get('includeShp') === '1'

  const merchant = process.env.ROBO_MERCHANT_LOGIN?.trim() || ''
  const isTest = process.env.ROBO_IS_TEST === '1'
  const password1Raw = process.env.ROBO_PASSWORD1?.trim() || ''
  const password1Test = process.env.ROBO_PASSWORD1_TEST?.trim() || ''
  const password1 = isTest ? password1Test : password1Raw

  if (!merchant || !password1 || !out || !invId) {
    return NextResponse.json({ error: 'Missing params or credentials' }, { status: 400 })
  }

  const base = `${merchant}:${out}:${invId}:${password1}`
  const sigLower = crypto.createHash('md5').update(base, 'utf8').digest('hex').toLowerCase()
  const sigUpper = crypto.createHash('md5').update(base, 'utf8').digest('hex').toUpperCase()

  let sigWithShp: string | null = null
  if (includeShp) {
    const shp: Record<string,string> = {}
    if (promo) shp['Shp_promo'] = promo
    if (ref) shp['Shp_ref'] = ref
    const sorted = Object.keys(shp).sort()
    const shpString = sorted.map(k => `${k}=${shp[k]}`).join(':')
    const baseShp = shpString ? `${base}:${shpString}` : base
    sigWithShp = crypto.createHash('md5').update(baseShp, 'utf8').digest('hex').toLowerCase()
  }

  return NextResponse.json({
    merchant,
    out,
    invId,
    signatureLower: sigLower,
    signatureUpper: sigUpper,
    signatureWithShp: sigWithShp,
    usedTestPassword: isTest,
  })
}
