-- Run once in the Supabase dashboard: SQL Editor → New query → Run.
-- Stores the unpaid-checkout reminder the admin can edit.
-- Until this is run, reminders still send, using the built-in wording, and saving new wording is refused.

create table if not exists public.shop_settings (
  key text primary key,
  value text not null
);

alter table public.shop_settings enable row level security;

revoke all on table public.shop_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.shop_settings to service_role;
