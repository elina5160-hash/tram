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
    let supabaseSuccess = false;
    if (supabase) {
        const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
        if (!error) {
             supabaseSuccess = true;
        } else {
             console.error('Supabase update failed', error);
             return NextResponse.json({ error: 'Supabase update failed: ' + error.message }, { status: 500 });
        }
    }

    // Always update JSON as well to keep in sync
    const products = getProductsFromJson();
    
    const index = products.findIndex((p: any) => p.id === id);
    if (index !== -1) {
       products[index] = { ...products[index], ...updates };
       saveProductsToJson(products);
    }
    
    if (supabaseSuccess) {
         // Return the updated data (or updates)
         return NextResponse.json({ ...updates, id });
    }
    
    if (index !== -1) {
        return NextResponse.json(products[index]);
    }

    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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
    let supabaseSuccess = false;
    if (supabase) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            supabaseSuccess = true;
        } else {
            console.error('Supabase delete failed', error);
        }
    }

    // Always try JSON as well
    const products = getProductsFromJson();
    
    const newProducts = products.filter((p: any) => p.id !== id);
    const jsonDeleted = newProducts.length !== products.length;
    
    if (jsonDeleted) {
       saveProductsToJson(newProducts);
    }
    
    if (supabaseSuccess || jsonDeleted) {
       return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
