import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), process.cwd().endsWith('frontend') ? 'data/products.json' : 'frontend/data/products.json');

// Helper to read data
function getProducts() {
  try {
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Fallback if file doesn't exist or error (shouldn't happen if setup correctly)
    return [];
  }
}

// Helper to write data
function saveProducts(products: any[]) {
  fs.writeFileSync(dataPath, JSON.stringify(products, null, 2), 'utf8');
}

export async function GET() {
  const products = getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const newProduct = await request.json();
    const products = getProducts();
    
    // Generate new ID if not provided
    const id = newProduct.id || (products.length > 0 ? Math.max(...products.map((p: any) => p.id)) + 1 : 1);
    
    const productToAdd = { ...newProduct, id: Number(id) };
    products.push(productToAdd);
    
    saveProducts(products);
    
    return NextResponse.json(productToAdd, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
