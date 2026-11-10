-- Starter catalog. Outlines are close approximations; adjust each device's
-- geometry after a test print on the machine (Admin → Catalog).

insert into brands (id, name, sort, active) values
  ('apple','Apple',1,true),
  ('samsung','Samsung',2,false),
  ('google','Google',3,false),
  ('moto','Moto',4,false)
on conflict (id) do nothing;

insert into devices (id, brand_id, name, sort, geometry) values
  ('ip16promax','apple','iPhone 16 Pro Max',1,
   '{"w":79,"h":165,"r":12.5,"cam":{"x":3.4,"y":3.4,"w":41.5,"h":41.5,"r":10,"lenses":[[11.8,11.8,7.8],[11.8,29.7,7.8],[29,20.75,7.8]],"flash":[29.5,7.8,2.6]}}'),
  ('ip16pro','apple','iPhone 16 Pro',2,
   '{"w":74,"h":151,"r":11.5,"cam":{"x":3.2,"y":3.2,"w":38.5,"h":38.5,"r":9.5,"lenses":[[11,11,7.2],[11,27.5,7.2],[27,19.25,7.2]],"flash":[27.5,7.4,2.4]}}'),
  ('ip16','apple','iPhone 16',3,
   '{"w":73.5,"h":150,"r":11.5,"cam":{"x":4,"y":4,"w":17,"h":36,"r":8.5,"lenses":[[8.5,9,6],[8.5,27,6]]}}')
on conflict (id) do nothing;

insert into products (id, code, name, description, finish, sort) values
  ('m2','M2','Skin-Touch Magnetic Case',
   'Soft matte feel with built-in magnets for MagSafe chargers. Raised lens frame and precise button cutouts.','solid',1),
  ('m3','M3','Clear Case',
   'Hard, scratch-resistant clear back. Your design prints right onto it, and any part you leave empty stays see-through.','clear',2)
on conflict (id) do nothing;

insert into variants (device_id, product_id, price_cents, stock)
select d.id, p.id, case p.id when 'm2' then 3000 else 2000 end, 100
from devices d cross join products p
on conflict (device_id, product_id) do nothing;
