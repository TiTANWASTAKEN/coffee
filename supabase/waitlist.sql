-- Run once in the Supabase dashboard: SQL Editor → New query → Run.
-- The free project is enough. Visitors cannot read this table.

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon, authenticated;
