import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServiceSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
        // Use maybeSingle() to avoid error if row doesn't exist
        const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().maybeSingle();
        
        if (!error) {
             if (data) {
                 supabaseSuccess = true;
             } else {
                 // Product not found in Supabase. Try to insert it (sync from JSON logic essentially)
                 console.log('Product not found in Supabase during update, attempting insert...', id);
                 
                 const products = getProductsFromJson();
                 const existing = products.find((p: any) => p.id === id);
                 const toInsert = existing ? { ...existing, ...updates, id } : { ...updates, id };
                 
                 const { error: insertError } = await supabase.from('products').insert(toInsert).select().maybeSingle();
                 if (!insertError) {
                     supabaseSuccess = true;
                 } else {
                     console.error('Supabase insert fallback failed', insertError);
                     // Fallback to JSON instead of failing
                 }
             }
        } else {
             console.error('Supabase update failed', error);
             // Fallback to JSON instead of failing
        }
    }

    // Update JSON as backup/sync (always do this if Supabase failed or even if it succeeded)
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
