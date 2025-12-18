import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServiceSupabaseClient } from '@/lib/supabase';

const dataPath = path.join(process.cwd(), process.cwd().endsWith('frontend') ? 'data/products.json' : 'frontend/data/products.json');

function getProductsFromJson() {
  try {
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
  }
}

function saveProductsToJson(products: any[]) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(products, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save JSON', e)
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = Number(params.id);
    const updates = await request.json();

    // Try Supabase
    const supabase = getServiceSupabaseClient();
    if (supabase) {
        const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
        if (!error) {
             return NextResponse.json(data || { ...updates, id });
        }
        console.error('Supabase update failed', error);
    }

    // Fallback JSON
    const products = getProductsFromJson();
    
    const index = products.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    products[index] = { ...products[index], ...updates };
    saveProductsToJson(products);
    
    return NextResponse.json(products[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = Number(params.id);

    // Try Supabase
    const supabase = getServiceSupabaseClient();
    if (supabase) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            return NextResponse.json({ success: true });
        }
        console.error('Supabase delete failed', error);
    }

    // Fallback JSON
    const products = getProductsFromJson();
    
    const newProducts = products.filter((p: any) => p.id !== id);
    if (newProducts.length === products.length) {
      // If JSON didn't have it, maybe it was only in DB (which failed?) or truly missing
      // But if DB failed, we already logged it.
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    saveProductsToJson(newProducts);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
