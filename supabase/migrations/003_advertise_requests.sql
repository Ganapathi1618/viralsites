-- Adds the advertise_requests table for the /advertise page.
-- Run this on a database created before the page existed. Safe to re-run.

create table if not exists public.advertise_requests (
  id           uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_url  text not null,
  one_liner    text not null,
  email        text not null,
  status       text not null default 'pending'
                 check (status in ('pending','paid','cancelled')),
  created_at   timestamptz not null default now()
);

create index if not exists advertise_requests_created_at_idx
  on public.advertise_requests (created_at desc);

alter table public.advertise_requests enable row level security;

-- Insert-only for visitors. These rows hold email addresses, so reads are
-- reserved for the service role.
drop policy if exists "anyone can request ad slot" on public.advertise_requests;
create policy "anyone can request ad slot"
  on public.advertise_requests for insert with check (true);
