
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://meibdfguaaqcprvyfrpr.supabase.co';
const supabaseKey = 'sb_publishable_x-MDT8_TQeuWIp4vuCk05w_V1c_xJZ1'; // Anon Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing Supabase insert...");
  
  const invId = Math.floor(Date.now() / 1000);
  
  const payload = {
    id: invId,
    total_amount: 10.00,
    items: [{ name: "Test Item", quantity: 1, cost: 10 }],
    customer_info: { name: "Test User", email: "test@example.com" },
    promo_code: "TESTCODE",
    ref_code: "REF123",
    status: 'pending',
    updated_at: new Date().toLocaleTimeString('en-GB', { hour12: false }) // FIX: Send only time HH:mm:ss
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select();

  if (error) {
    console.error("Insert Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Insert Success:", data);
  }
}

testInsert();
