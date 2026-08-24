-- ViralSites.fyi — Supabase schema
-- Paste this whole file into the Supabase SQL editor and hit Run.
-- Safe to re-run: every statement is idempotent.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- sites ----
create table if not exists public.sites (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  url                text not null unique,
  description        text not null default '',
  model_type         text not null default 'other'
                       check (model_type in ('bid','pixel','leaderboard','sponsor','other')),
  revenue_amount     numeric(12,2) not null default 0,
  revenue_verified   boolean not null default false,
  revenue_source_url text,
  trend_percent      numeric(6,2),
  launched_at        date,
  is_featured        boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists sites_revenue_idx    on public.sites (revenue_amount desc);
create index if not exists sites_model_type_idx on public.sites (model_type);
create index if not exists sites_created_at_idx on public.sites (created_at desc);

-- ------------------------------------------------------------- ad_slots ----
create table if not exists public.ad_slots (
  id                     uuid primary key default gen_random_uuid(),
  position               int not null unique check (position between 1 and 9),
  company_name           text,
  company_url            text,
  one_liner              text,
  stripe_subscription_id text,
  stripe_customer_id     text,
  is_active              boolean not null default false,
  activated_at           timestamptz,
  cancelled_at           timestamptz,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------- submissions ----
create table if not exists public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  url                text not null,
  name               text not null,
  one_liner          text not null default '',
  model_type         text not null default 'other'
                       check (model_type in ('bid','pixel','leaderboard','sponsor','other')),
  revenue_amount     numeric(12,2),
  revenue_source_url text,
  launched_at        date,
  submitter_email    text,
  -- Submissions go live immediately; 'pending' and 'rejected' remain available
  -- for taking a site back down by hand.
  status             text not null default 'approved'
                       check (status in ('pending','approved','rejected')),
  created_at         timestamptz not null default now()
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);

-- ------------------------------------------------------ updated_at bump ----
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sites_touch_updated_at on public.sites;
create trigger sites_touch_updated_at
  before update on public.sites
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ RLS ----
alter table public.sites       enable row level security;
alter table public.ad_slots    enable row level security;
alter table public.submissions enable row level security;

-- The directory and both sidebars are public reads.
drop policy if exists "sites are public" on public.sites;
create policy "sites are public" on public.sites for select using (true);

-- Only live sponsors are readable, so a cancelled advertiser's details are not
-- served to the browser.
drop policy if exists "active ad slots are public" on public.ad_slots;
create policy "active ad slots are public" on public.ad_slots for select using (is_active);

-- Submissions are write-only for visitors: anyone may insert, nobody may read
-- them back. Emails stay private; moderation happens with the service role.
drop policy if exists "anyone can submit" on public.submissions;
create policy "anyone can submit" on public.submissions for insert with check (true);

-- Writes to sites and ad_slots come from the scraper and the Stripe webhook,
-- both of which use the service role key and bypass RLS entirely.

-- ------------------------------------------------------------ ad slots -----
-- Six slots, all open. Positions 1-3 render in the left rail, 4-6 in the
-- right. Nothing is pre-filled: an occupied slot means a real paying
-- advertiser, never a placeholder.
insert into public.ad_slots (position, company_name, company_url, one_liner, is_active)
values
  (1, null, null, null, false),
  (2, null, null, null, false),
  (3, null, null, null, false),
  (4, null, null, null, false),
  (5, null, null, null, false),
  (6, null, null, null, false)
on conflict (position) do nothing;

-- ---------------------------------------------------------------- seed -----
-- Ten sites. Revenue figures come from public posts; treat unverified rows as
-- estimates until a source URL is attached.
insert into public.sites
  (name, url, description, model_type, revenue_amount, revenue_verified, trend_percent, launched_at, is_featured)
values
  ('outbid.lol',   'https://outbid.lol',   'Pay more than the person above you and take the top slot.', 'bid',         230000, true,  12.4, '2025-05-01', true),
  ('million.dev',  'https://million.dev',  'A million pixels, sold once, a dollar at a time.',          'pixel',       180000, true,   3.1, '2025-01-01', true),
  ('theboard.fyi', 'https://theboard.fyi', 'A leaderboard of makers ranked by what they ship.',         'leaderboard',  92000, true,   8.7, '2025-03-01', true),
  ('pixelwall.io', 'https://pixelwall.io', 'Ten thousand pixels, resold every quarter.',                'pixel',        71000, false,  1.9, '2025-02-01', false),
  ('bidboard.co',  'https://bidboard.co',  'One board, one bid, highest offer holds the space.',        'bid',          55000, false, -2.4, '2025-04-01', false),
  ('outbid.fyi',   'https://outbid.fyi',   'A directory of sponsor boards and who is paying for them.', 'sponsor',      35000, true,  22.8, '2025-06-01', false),
  ('spotbid.xyz',  'https://spotbid.xyz',  'Auction a single spot, every single day.',                  'bid',          12000, false, 41.2, '2025-07-01', false),
  ('rankme.fyi',   'https://rankme.fyi',   'Climb the rank by paying, or by shipping. Both work.',      'leaderboard',   8400, false, 16.5, '2025-07-01', false),
  ('pixelbid.app', 'https://pixelbid.app', 'Bid on a pixel. Outbid, and it changes hands.',             'bid',           6200, false, 57.9, '2025-08-01', false),
  ('outrank.io',   'https://outrank.io',   'A public ranking nobody can edit except with money.',       'leaderboard',   4800, false,  9.3, '2025-08-01', false)
on conflict (url) do nothing;
