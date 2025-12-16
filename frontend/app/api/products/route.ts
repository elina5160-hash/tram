import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataPath = path.join(process.cwd(), process.cwd().endsWith('frontend') ? 'data/products.json' : 'frontend/data/products.json');

// Simple in-memory cache
let productsCache: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

// Helper to read data
async function getProducts() {
  const now = Date.now();
  if (productsCache && (now - lastCacheTime < CACHE_TTL)) {
    return productsCache;
  }

  try {
    const fileContent = await fs.readFile(dataPath, 'utf8');
    productsCache = JSON.parse(fileContent);
    lastCacheTime = now;
    return productsCache;
  } catch (error) {
    // Fallback if file doesn't exist or error (shouldn't happen if setup correctly)
    return [];
  }
}

// Helper to write data
async function saveProducts(products: any[]) {
  await fs.writeFile(dataPath, JSON.stringify(products, null, 2), 'utf8');
  productsCache = products;
  lastCacheTime = Date.now();
}

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
    },
  });
}

export async function POST(request: Request) {
  try {
    const newProduct = await request.json();
    const products = (await getProducts()) || [];
    
    // Generate new ID if not provided
    const id = newProduct.id || (products.length > 0 ? Math.max(...products.map((p: any) => p.id)) + 1 : 1);
    
    const productToAdd = { ...newProduct, id: Number(id) };
    products.push(productToAdd);
    
    await saveProducts(products);
    
    return NextResponse.json(productToAdd, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
