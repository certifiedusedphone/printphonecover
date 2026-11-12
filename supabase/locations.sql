-- Machine locations + store pickup. Run once in the Supabase SQL editor (safe to run again).

create table if not exists locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                 -- e.g. "Mobile Spot – Timberland"
  line1      text not null,
  line2      text,
  city       text not null,
  state      text not null,
  zip        text not null,
  phone      text,
  hours      text,                          -- e.g. "Mon–Sat 10am–8pm, Sun 12–6pm"
  note       text,                          -- e.g. "Inside the mall, near the food court"
  lat        double precision,
  lng        double precision,
  pickup     boolean not null default true, -- customers can choose this place for pickup
  active     boolean not null default true, -- shown on the website
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
alter table locations enable row level security;

alter table orders add column if not exists fulfillment text not null default 'ship';  -- 'ship' | 'pickup'
alter table orders add column if not exists pickup_location_id uuid references locations(id) on delete set null;
alter table orders add column if not exists pickup_location_name text;
