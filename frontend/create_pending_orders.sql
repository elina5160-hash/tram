-- Таблица для временного хранения заказов перед оплатой
create table if not exists pending_orders (
  id bigint primary key, -- ID заказа (InvId)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  total_amount numeric not null,
  items jsonb default '[]'::jsonb,
  customer_info jsonb default '{}'::jsonb,
  promo_code text,
  ref_code text,
  status text default 'pending',
  updated_at text -- Поле для времени, которое используется в коде
);

-- Включение RLS
alter table pending_orders enable row level security;

-- Политики доступа (открытые для простоты, как в orders)
create policy "Enable read access for all users"
on pending_orders for select
using (true);

create policy "Enable insert access for all users"
on pending_orders for insert
with check (true);

create policy "Enable update access for all users"
on pending_orders for update
using (true);

create policy "Enable delete access for all users"
on pending_orders for delete
using (true);
