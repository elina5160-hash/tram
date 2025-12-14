-- Создание таблицы заказов (если не существует)
create table if not exists orders (
  id bigint primary key, -- ID заказа (InvId из Robokassa)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  total_amount numeric not null,
  items jsonb default '[]'::jsonb, -- Список товаров
  customer_info jsonb default '{}'::jsonb, -- Email, имя и т.д.
  promo_code text,
  ref_code text,
  status text default 'pending' -- pending, paid, cancelled, test_success
);

-- Включение RLS
alter table orders enable row level security;

-- Политики доступа (настройте под свои нужды, здесь открытый доступ для теста)
create policy "Enable read access for all users"
on orders for select
using (true);

create policy "Enable insert access for all users"
on orders for insert
with check (true);

create policy "Enable update access for all users"
on orders for update
using (true);
