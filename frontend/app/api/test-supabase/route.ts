import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Используем Service Role Key для теста, чтобы обойти возможные ограничения RLS, 
    // если пользователь забыл их настроить, но лучше тестировать с публичным ключом если цель - проверка клиента.
    // Для чистоты эксперимента используем те же ключи, что и клиент, но можно и admin.
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Пробуем прочитать данные
    const { data, error } = await supabase
      .from('test_connection')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 2. Пробуем добавить тестовую запись
    const { error: insertError } = await supabase
      .from('test_connection')
      .insert([{ message: `Test from API at ${new Date().toISOString()}` }])

    if (insertError) {
      return NextResponse.json({ 
        success: true, 
        message: 'Read successful, but insert failed (likely RLS)', 
        data 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Connection verified! Read and Write successful.', 
      data 
    })

  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
