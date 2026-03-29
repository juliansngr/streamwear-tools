-- Shopify Webhook Refactor + Commission System (Supabase / Postgres)
-- Safe & additive: uses IF NOT EXISTS and DO-block guards where needed.
-- Run in Supabase SQL Editor (public schema).

begin;

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) profiles.commission_rate (numeric NOT NULL DEFAULT 0.2 + allowed tiers)
-- -----------------------------------------------------------------------------
do $$
begin
  -- Add column if missing
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'commission_rate'
  ) then
    alter table public.profiles
      add column commission_rate numeric not null default 0.2;
  end if;

  -- Ensure default + not null (safe if already set)
  execute 'alter table public.profiles alter column commission_rate set default 0.2';
  execute 'update public.profiles set commission_rate = 0.2 where commission_rate is null';
  execute 'alter table public.profiles alter column commission_rate set not null';

  -- Check constraint for allowed tiers (0.20 / 0.25 / 0.30)
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_commission_rate_allowed_chk'
  ) then
    alter table public.profiles
      add constraint profiles_commission_rate_allowed_chk
      check (commission_rate in (0.2, 0.25, 0.3));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) shop_orders: ensure shopify_order_id unique + columns used by code
-- -----------------------------------------------------------------------------
-- Unique index required for ON CONFLICT (upsert)
create unique index if not exists shop_orders_shopify_order_id_uidx
  on public.shop_orders (shopify_order_id);

-- Add missing columns (order head)
alter table public.shop_orders
  add column if not exists order_name text,
  add column if not exists order_created_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists financial_status text,
  add column if not exists fulfillment_status text,
  add column if not exists currency text,
  add column if not exists subtotal numeric,
  add column if not exists shipping numeric,
  add column if not exists taxes numeric,
  add column if not exists total numeric,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric,
  add column if not exists refunded_amount numeric,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_id text,
  add column if not exists source text,
  add column if not exists risk_level text,
  add column if not exists shipping_method text,
  add column if not exists customer_email text,
  add column if not exists billing_name text,
  add column if not exists shipping_name text,
  add column if not exists billing_country text,
  add column if not exists shipping_country text,
  add column if not exists billing_city text,
  add column if not exists shipping_city text,
  add column if not exists item_rows_count integer,
  add column if not exists total_item_quantity integer,
  add column if not exists needs_review_multiple_streamers boolean not null default false,
  add column if not exists needs_review boolean not null default false,
  add column if not exists items_summary_json jsonb,
  add column if not exists commission_status text;

create index if not exists shop_orders_order_created_at_idx
  on public.shop_orders (order_created_at);

-- -----------------------------------------------------------------------------
-- 3) shop_order_items: columns for mapping + status + commission + idempotency
-- -----------------------------------------------------------------------------
-- Unique index required for ON CONFLICT (upsert)
create unique index if not exists shop_order_items_line_item_uid_uidx
  on public.shop_order_items (line_item_uid);

-- Add missing columns (core item table)
alter table public.shop_order_items
  add column if not exists line_item_uid text,
  add column if not exists shopify_order_id text,
  add column if not exists shop_order_id uuid,
  add column if not exists shopify_connector_id uuid,
  add column if not exists order_created_at timestamptz,
  add column if not exists order_name text,
  add column if not exists customer_email text,
  add column if not exists lineitem_name text,
  add column if not exists lineitem_quantity integer,
  add column if not exists lineitem_price numeric,
  add column if not exists lineitem_discount numeric,
  add column if not exists currency text,
  add column if not exists discount_code text,
  add column if not exists financial_status text,
  add column if not exists fulfillment_status text,
  add column if not exists paid_at timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists current_quantity integer,
  add column if not exists is_cancelled boolean not null default false,
  add column if not exists is_refunded boolean not null default false,
  add column if not exists needs_review boolean not null default false,
  add column if not exists commission_rate numeric,
  add column if not exists commission_amount numeric,
  add column if not exists commission_status text;

-- Guard: shop_order_items.shop_order_id must be uuid (not bigint)
do $$
declare
  t text;
begin
  select c.udt_name into t
  from information_schema.columns c
  where c.table_schema='public'
    and c.table_name='shop_order_items'
    and c.column_name='shop_order_id'
  limit 1;

  if t is not null and t <> 'uuid' then
    raise exception 'Expected public.shop_order_items.shop_order_id to be uuid, but found type %', t;
  end if;
end $$;

create index if not exists shop_order_items_shopify_order_id_idx
  on public.shop_order_items (shopify_order_id);

create index if not exists shop_order_items_shopify_connector_id_idx
  on public.shop_order_items (shopify_connector_id);

create index if not exists shop_order_items_order_created_at_idx
  on public.shop_order_items (order_created_at);

-- FK: shopify_connector_id -> profiles.uuid (nullable)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='shop_order_items'
      and column_name='shopify_connector_id'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'shop_order_items_shopify_connector_id_fkey'
  ) then
    alter table public.shop_order_items
      add constraint shop_order_items_shopify_connector_id_fkey
      foreign key (shopify_connector_id)
      references public.profiles (uuid)
      on delete set null;
  end if;
end $$;

-- Optional but recommended: constrain commission_status values (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_order_items_commission_status_allowed_chk'
  ) then
    alter table public.shop_order_items
      add constraint shop_order_items_commission_status_allowed_chk
      check (
        commission_status is null
        or commission_status in ('pending','locked','available','paid','reversed')
      );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4) Optional: shopify_webhook_events (raw logging + dedupe)
-- -----------------------------------------------------------------------------
create table if not exists public.shopify_webhook_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id text not null,
  topic text,
  shop_domain text,
  shopify_order_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create unique index if not exists shopify_webhook_events_webhook_id_uidx
  on public.shopify_webhook_events (webhook_id);

create index if not exists shopify_webhook_events_shopify_order_id_idx
  on public.shopify_webhook_events (shopify_order_id);

create index if not exists shopify_webhook_events_topic_idx
  on public.shopify_webhook_events (topic);

commit;

