import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseClient, getServiceSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const dataPath = path.join(process.cwd(), process.cwd().endsWith('frontend') ? 'data/products.json' : 'frontend/data/products.json');

// Helper to read data from JSON (Fallback)
function getProductsFromJson() {
  try {
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
  }
}

// Helper to write data to JSON (Fallback)
function saveProductsToJson(products: any[]) {
  try {
      fs.writeFileSync(dataPath, JSON.stringify(products, null, 2), 'utf8');
  } catch (e) {
      console.error('Failed to save to JSON', e);
  }
}

export async function GET() {
  const supabase = getServiceSupabaseClient();
  
  // 1. Try Supabase
  if (supabase) {
      try {
          const { data, error } = await supabase.from('products').select('*').order('id');
          if (!error) {
              const dbData = data || [];
              const localProducts = getProductsFromJson();
              
              // Prefer Database Data as Source of Truth
              if (dbData.length > 0) {
                  return NextResponse.json(dbData);
              }

              // Only fallback to JSON if DB is empty (e.g. fresh install or connection issue that returned empty array instead of error)
              return NextResponse.json(localProducts);
          }
      } catch (e) {
          console.error('Supabase fetch failed, falling back to JSON', e);
      }
  }

  // 2. Fallback to JSON
  const products = getProductsFromJson();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const newProduct = await request.json();
    
    // Try Supabase first
    const supabase = getServiceSupabaseClient(); // Use service role for writing if available
    if (supabase) {
        // Manually generate ID to avoid schema issues (if id is not auto-increment)
        if (!newProduct.id) {
            const { data: maxData } = await supabase.from('products').select('id').order('id', { ascending: false }).limit(1).maybeSingle();
            const maxId = maxData?.id || 0;
            newProduct.id = maxId + 1;
        }

        const { data, error } = await supabase.from('products').insert(newProduct).select().single();
        if (!error && data) {
            return NextResponse.json(data, { status: 201 });
        }
        if (error) {
            console.error('Supabase insert failed', error);
            // If Supabase fails, we might want to try JSON fallback?
            // But usually we should return error. 
            // However, to keep it working if Supabase is broken, let's just log and continue to JSON?
            // No, that creates inconsistency. Return error is safer.
            return NextResponse.json({ error: 'Supabase insert failed: ' + error.message }, { status: 500 });
        }
    }

    // Fallback to JSON
    const products = getProductsFromJson();
    // Generate new ID if not provided
    const id = newProduct.id || (products.length > 0 ? Math.max(...products.map((p: any) => p.id)) + 1 : 1);
    const productToAdd = { ...newProduct, id: Number(id) };
    products.push(productToAdd);
    saveProductsToJson(products);
    
    return NextResponse.json(productToAdd, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
