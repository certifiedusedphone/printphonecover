-- Amazon / TikTok orders in the same queue. Run once in the Supabase SQL editor (safe to run again).
alter table orders add column if not exists channel text not null default 'web';   -- 'web' | 'amazon' | 'tiktok'
alter table orders add column if not exists channel_order_id text;                 -- marketplace order number
alter table orders alter column email drop not null;                               -- marketplaces may hide the buyer email
create unique index if not exists orders_channel_order_idx on orders(channel, channel_order_id) where channel_order_id is not null;
