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

-- The 10 machine locations (safe to run again: updates them in place).
-- Map positions are close approximations so "closest first" works right away;
-- saving a location in Admin refines it from the address once the Google key is set.
insert into locations (id, name, line1, line2, city, state, zip, phone, hours, note, lat, lng, pickup, active, sort) values
 ('0b9d1d3e-0001-4000-8000-000000000001','Harwin Dr · Houston','6855 Harwin Dr.','Suite M1','Houston','TX','77036','+1 832-566-8506','10:00 AM – 7:00 PM',null,29.7066,-95.5278,true,true,1),
 ('0b9d1d3e-0001-4000-8000-000000000002','Inside HEB · Bay City','2700 7th St',null,'Bay City','TX','77414','+1 832-566-8506','6:00 AM – 11:00 PM','Inside HEB',28.9810,-95.9660,true,true,2),
 ('0b9d1d3e-0001-4000-8000-000000000003','Inside HEB · Lufkin','111 N Timberland Dr',null,'Lufkin','TX','75901','+1 832-566-8506','Mon–Sat 10:00 AM – 9:00 PM · Sun 12:00–6:00 PM','Inside HEB',31.3390,-94.7290,true,true,3),
 ('0b9d1d3e-0001-4000-8000-000000000004','Inside HEB · Cuero','909 E Broadway St',null,'Cuero','TX','77954','+1 832-566-8506','6:00 AM – 11:00 PM','Inside HEB',29.0930,-97.2820,true,true,4),
 ('0b9d1d3e-0001-4000-8000-000000000005','Inside La Michoacana · Nacogdoches','1000 North St',null,'Nacogdoches','TX','75961','+1 832-566-8506','9:00 AM – 10:00 PM','Inside La Michoacana',31.6110,-94.6530,true,true,5),
 ('0b9d1d3e-0001-4000-8000-000000000006','Inside HEB · Corpus Christi (Leopard St)','11100 Leopard St',null,'Corpus Christi','TX','78410','+1 832-566-8506','6:00 AM – 11:00 PM','Inside HEB',27.8470,-97.6050,true,true,6),
 ('0b9d1d3e-0001-4000-8000-000000000007','Inside HEB · Corpus Christi (S Alameda)','3133 S Alameda St',null,'Corpus Christi','TX','78404','+1 832-566-8506','6:00 AM – 11:00 PM','Inside HEB',27.7560,-97.3940,true,true,7),
 ('0b9d1d3e-0001-4000-8000-000000000008','Inside HEB · San Antonio','1015 S WW White Rd',null,'San Antonio','TX','78220','+1 832-566-8506','6:00 AM – 11:00 PM','Inside HEB',29.4110,-98.4160,true,true,8),
 ('0b9d1d3e-0001-4000-8000-000000000009','Inside HEB · Corpus Christi (4320 Alameda)','4320 S Alameda St',null,'Corpus Christi','TX','78412','+1 832-566-8506','6:00 AM – 11:00 PM','Inside HEB',27.7380,-97.3830,true,true,9),
 ('0b9d1d3e-0001-4000-8000-000000000010','N Houston Rosslyn · Houston','9436 N Houston Rosslyn Rd','Suite H','Houston','TX','77088','+1 832-566-8506','Coming soon · 10:00 AM – 9:00 PM','Coming soon',29.8770,-95.4840,false,true,10)
on conflict (id) do update set name = excluded.name, line1 = excluded.line1, line2 = excluded.line2, city = excluded.city, state = excluded.state,
  zip = excluded.zip, phone = excluded.phone, hours = excluded.hours, note = excluded.note, lat = excluded.lat, lng = excluded.lng,
  pickup = excluded.pickup, active = excluded.active, sort = excluded.sort;
