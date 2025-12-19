
const { createClient } = require('@supabase/supabase-js');

const url = 'https://meibdfguaaqcprvyfrpr.supabase.co';
const serviceKey = 'sb_secret_SPrBXjcxZGla_dVXDwEhbg_uJa5DQXE';

async function testUpdate() {
  const supabase = createClient(url, serviceKey);

  console.log('Testing update for ID 1...');
  
  // 1. Check if it exists
  const { data: existing, error: findError } = await supabase
    .from('products')
    .select('*')
    .eq('id', 1)
    .single();
    
  if (findError) {
      console.log('Product 1 not found or error:', findError);
  } else {
      console.log('Product 1 exists:', existing.title);
  }

  // 2. Try update
  const { data, error } = await supabase
    .from('products')
    .update({ 
        description: 'Update Test ' + new Date().toISOString()
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update success:', data);
  }
}

testUpdate();
