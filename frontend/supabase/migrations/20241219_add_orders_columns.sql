alter table orders 
add column if not exists updated_at timestamp with time zone default now();

-- Add policy for update if not exists (though the existing one covers it)
-- create policy "Enable update access for all users" on orders for update using (true);
