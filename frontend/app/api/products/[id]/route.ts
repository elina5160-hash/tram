import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), process.cwd().endsWith('frontend') ? 'data/products.json' : 'frontend/data/products.json');

function getProducts() {
  try {
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
  }
}

function saveProducts(products: any[]) {
  fs.writeFileSync(dataPath, JSON.stringify(products, null, 2), 'utf8');
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const updates = await request.json();
    const products = getProducts();
    
    const index = products.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    products[index] = { ...products[index], ...updates };
    saveProducts(products);
    
    return NextResponse.json(products[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const products = getProducts();
    
    const newProducts = products.filter((p: any) => p.id !== id);
    if (newProducts.length === products.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    saveProducts(newProducts);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
