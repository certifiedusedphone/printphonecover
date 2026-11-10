-- PrintPhoneCover database. Run once in the Supabase SQL editor of a NEW project.
-- All access goes through the server (service role), so RLS is on with no public policies.

create extension if not exists pgcrypto;

-- Catalog -------------------------------------------------------------------
-- brand  → device (the printable shape: a phone model today, a tumbler later)
-- product (case type: M2, M3 …) × device = variant (price + stock)

create table if not exists brands (
  id     text primary key,            -- 'apple'
  name   text not null,               -- 'Apple'
  sort   int  not null default 0,
  active boolean not null default true
);

create table if not exists devices (
  id       text primary key,          -- 'ip16pro'
  brand_id text not null references brands(id),
  name     text not null,             -- 'iPhone 16 Pro'
  sort     int  not null default 0,
  -- Print outline in millimetres. Shape:
  -- {"w":74,"h":151,"r":11.5,"cam":{"x":3.2,"y":3.2,"w":38.5,"h":38.5,"r":9.5,
  --   "lenses":[[11,11,7.2],...],"flash":[27.5,7.4,2.4]}}
  geometry jsonb not null,
  active   boolean not null default true
);

create table if not exists products (
  id          text primary key,       -- 'm2'
  code        text not null,          -- 'M2'
  name        text not null,
  description text not null default '',
  kind        text not null default 'phone_case',  -- room for other products later
  finish      text not null default 'solid',       -- 'solid' (white base) or 'clear'
  sort        int  not null default 0,
  active      boolean not null default true
);

create table if not exists variants (
  id          uuid primary key default gen_random_uuid(),
  device_id   text not null references devices(id) on delete cascade,
  product_id  text not null references products(id) on delete cascade,
  price_cents int  not null check (price_cents >= 0),
  stock       int  not null default 0,
  active      boolean not null default true,
  unique (device_id, product_id)
);

-- Orders --------------------------------------------------------------------
do $$ begin
  create type order_status as enum ('pending','paid','printing','shipped','delivered','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique,            -- PPC-261109-4821
  token            text not null,                   -- secret for the customer's tracking link
  status           order_status not null default 'pending',
  email            text not null,
  phone            text,
  ship_name        text not null,
  ship_line1       text not null,
  ship_line2       text,
  ship_city        text not null,
  ship_state       text not null,
  ship_zip         text not null,
  address_verified boolean not null default false,
  shipping_method  text not null,                   -- 'standard' | 'priority'
  variant_id       uuid references variants(id),
  device_name      text not null,
  product_name     text not null,
  subtotal_cents   int not null,
  shipping_cents   int not null,
  tax_cents        int not null default 0,
  total_cents      int not null,
  design           jsonb,                           -- layer data, for reference
  print_path       text,                            -- storage: orders/<id>/print.png
  preview_path     text,                            -- storage: orders/<id>/preview.jpg
  stripe_session_id     text,
  stripe_payment_intent text,
  easypost_shipment_id  text,
  carrier          text,
  tracking_code    text,
  tracking_url     text,
  label_url        text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  printing_at  timestamptz,
  shipped_at   timestamptz,
  delivered_at timestamptz
);
create index if not exists orders_status_idx on orders(status, created_at desc);
create index if not exists orders_tracking_idx on orders(tracking_code);

create table if not exists order_events (
  id         bigserial primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  status     text not null,
  note       text,
  created_at timestamptz not null default now()
);

-- Take one case out of stock when an order is paid.
create or replace function decrement_stock(v_id uuid) returns void
language sql as $$
  update variants set stock = greatest(stock - 1, 0) where id = v_id;
$$;

alter table brands       enable row level security;
alter table devices      enable row level security;
alter table products     enable row level security;
alter table variants     enable row level security;
alter table orders       enable row level security;
alter table order_events enable row level security;

-- Private bucket for print files and previews
insert into storage.buckets (id, name, public)
values ('orders', 'orders', false)
on conflict (id) do nothing;
