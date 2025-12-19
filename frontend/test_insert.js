
const { createClient } = require('@supabase/supabase-js');

const url = 'https://meibdfguaaqcprvyfrpr.supabase.co';
// Using the key from .env.local which is labeled as SERVICE_ROLE_KEY
const key = 'sb_secret_SPrBXjcxZGla_dVXDwEhbg_uJa5DQXE'; 

async function testInsert() {
  const supabase = createClient(url, key);

  console.log('Testing INSERT with key ending in ...' + key.slice(-5));
  
  const newProduct = {
      title: 'RLS Test Product',
      price: '100 руб',
      category: 'sets'
  };

  const { data, error } = await supabase
    .from('products')
    .insert(newProduct)
    .select()
    .single();

  if (error) {
    console.error('INSERT FAILED:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
    // Cleanup
    await supabase.from('products').delete().eq('id', data.id);
  }
}

testInsert();
