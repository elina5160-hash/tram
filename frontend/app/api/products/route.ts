import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseClient, getServiceSupabaseClient } from '@/lib/supabase';

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
  const supabase = getSupabaseClient();
  
  // 1. Try Supabase
  if (supabase) {
      try {
          const { data, error } = await supabase.from('products').select('*').order('id');
          if (!error) {
              // Auto-migration: If Supabase is empty but JSON has data, migrate!
              if ((!data || data.length === 0)) {
                  const localProducts = getProductsFromJson();
                  if (localProducts.length > 0) {
                      const adminSupabase = getServiceSupabaseClient() || supabase;
                      // Clean data for insertion (remove extra fields if any)
                      const toInsert = localProducts.map((p: any) => ({
                          id: p.id,
                          title: p.title,
                          price: p.price,
                          image: p.image,
                          category: p.category,
                          description: p.description,
                          composition: p.composition
                      }));
                      const { error: insertError } = await adminSupabase.from('products').insert(toInsert);
                      if (!insertError) {
                          return NextResponse.json(localProducts);
                      }
                  }
              }
              return NextResponse.json(data || []);
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
        const { data, error } = await supabase.from('products').insert(newProduct).select().single();
        if (!error && data) {
            return NextResponse.json(data, { status: 201 });
        }
        if (error) console.error('Supabase insert failed', error);
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
