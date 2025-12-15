-- Migration to create a unified referrals and promo codes table
-- Table name: integration_referrals (or whatever name you prefer, e.g., contest_partners)

create table if not exists integration_referrals (
  id bigint generated always as identity primary key,
  name text,                                      -- Имя
  referral_link text unique,                      -- Ссылка реферальная
  promo_code text unique,                         -- Промокод
  tickets_count integer default 0,                -- Сколько билетов
  created_at timestamptz default now(),           -- Время создания
  invited_count integer default 0,                -- Сколько позвал
  buyers_list jsonb default '[]'::jsonb,          -- Кто купил по этой ссылке (храним как массив JSON)
  total_sales_amount numeric default 0            -- На какую сумму заказ
);

-- Optional: Add indexes for faster lookups
create index if not exists idx_integration_referrals_promo_code on integration_referrals(promo_code);
create index if not exists idx_integration_referrals_referral_link on integration_referrals(referral_link);

-- Comment on table and columns for clarity (visible in Supabase dashboard)
comment on table integration_referrals is 'Unified table for referrals and promo codes integration';
comment on column integration_referrals.name is 'Имя партнера/участника';
comment on column integration_referrals.referral_link is 'Реферальная ссылка';
comment on column integration_referrals.promo_code is 'Уникальный промокод';
comment on column integration_referrals.tickets_count is 'Количество билетов';
comment on column integration_referrals.created_at is 'Дата и время регистрации';
comment on column integration_referrals.invited_count is 'Количество приглашенных пользователей';
comment on column integration_referrals.buyers_list is 'Список покупателей (JSON массив)';
comment on column integration_referrals.total_sales_amount is 'Общая сумма продаж по ссылке/промокоду';
