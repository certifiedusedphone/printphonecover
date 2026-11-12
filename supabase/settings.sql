-- Site settings (social media links). Run once in the Supabase SQL editor (safe to run again).
create table if not exists site_settings (
  key   text primary key,
  value text not null default ''
);
alter table site_settings enable row level security;
insert into site_settings (key, value) values
  ('tiktok',''), ('instagram',''), ('facebook',''), ('youtube','')
on conflict (key) do nothing;
-- Business details used on the Contact, Privacy and Terms pages
insert into site_settings (key, value) values
  ('business_name',''), ('contact_email',''), ('contact_phone','+1 832-566-8506'),
  ('business_address','6855 Harwin Dr. Suite M1, Houston, TX 77036')
on conflict (key) do nothing;
