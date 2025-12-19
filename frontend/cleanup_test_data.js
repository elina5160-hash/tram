
const { createClient } = require('@supabase/supabase-js');

const url = 'https://meibdfguaaqcprvyfrpr.supabase.co';
const key = 'sb_secret_SPrBXjcxZGla_dVXDwEhbg_uJa5DQXE'; 

async function cleanup() {
  const supabase = createClient(url, key);
  
  // Find products with title like "RLS Test Product"
  const { data, error } = await supabase
    .from('products')
    .select('id, title')
    .ilike('title', '%RLS Test Product%');
    
  if (data && data.length > 0) {
      console.log('Found test products to delete:', data);
      const ids = data.map(p => p.id);
      await supabase.from('products').delete().in('id', ids);
      console.log('Deleted.');
  } else {
      console.log('No test products found.');
  }
}

cleanup();
