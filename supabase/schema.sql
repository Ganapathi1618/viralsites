-- ViralSites.fyi — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`) before first boot.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- sites ----
create table if not exists public.sites (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  url          text        not null unique,
  description  text        not null default '',
  model_type   text        not null check (model_type in ('bid','pixel','leaderboard','sponsor')),
  revenue      numeric(12,2) not null default 0,
  -- Revenue at the previous scrape. Used to derive the trend column in the UI.
  prev_revenue numeric(12,2),
  launched_at  date,
  is_verified  boolean     not null default false,
  source_link  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists sites_revenue_idx    on public.sites (revenue desc);
create index if not exists sites_model_type_idx on public.sites (model_type);
create index if not exists sites_created_at_idx on public.sites (created_at desc);

-- ------------------------------------------------------------- ad_slots ----
create table if not exists public.ad_slots (
  id                     uuid primary key default gen_random_uuid(),
  position               int  not null unique check (position between 1 and 6),
  company_name           text,
  url                    text,
  description            text,
  is_filled              boolean not null default false,
  stripe_subscription_id text,
  stripe_customer_id     text,
  filled_at              timestamptz,
  expires_at             timestamptz,
  created_at             timestamptz not null default now()
);

create index if not exists ad_slots_position_idx on public.ad_slots (position);

-- ---------------------------------------------------------- submissions ----
create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  name         text not null,
  description  text not null default '',
  model_type   text not null check (model_type in ('bid','pixel','leaderboard','sponsor')),
  revenue      numeric(12,2) not null default 0,
  source_link  text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now()
);

create index if not exists submissions_submitted_at_idx on public.submissions (submitted_at desc);

-- --------------------------------------------------------------- updated ---
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

-- Directory + sidebars are public reads.
drop policy if exists "sites are public"    on public.sites;
create policy "sites are public"    on public.sites    for select using (true);

drop policy if exists "ad slots are public" on public.ad_slots;
create policy "ad slots are public" on public.ad_slots for select using (true);

-- Submissions are write-only for anonymous visitors: anyone may insert, nobody
-- may read them back. Moderation happens with the service role key.
drop policy if exists "anyone can submit" on public.submissions;
create policy "anyone can submit" on public.submissions for insert with check (true);

-- Writes to sites / ad_slots come from the scraper and the Stripe webhook,
-- both of which use the service role key and bypass RLS. No policy needed.

-- ----------------------------------------------------------------- seed ----
-- Six ad slots: three sold (demo), three open at $50/month.
insert into public.ad_slots (position, company_name, url, description, is_filled)
values
  (1, 'Outbid.lol',   'https://outbid.lol',   'The original pay-to-rank leaderboard.', true),
  (2, 'PixelVault',   'https://example.com',  'Buy a pixel, own it forever.',          true),
  (3, 'IndieBoard',   'https://example.com',  'Where indie hackers ship in public.',   true),
  (4, null, null, null, false),
  (5, null, null, null, false),
  (6, null, null, null, false)
on conflict (position) do nothing;

-- A handful of demo sites so the directory is never empty on a fresh install.
insert into public.sites (name, url, description, model_type, revenue, prev_revenue, launched_at, is_verified, source_link)
values
  ('Outbid.lol',         'https://outbid.lol',         'Pay more than the person above you and take the top slot.',  'bid',         184320, 171400, '2025-01-14', true,  'https://outbid.lol'),
  ('OneMillionPixels',   'https://example.com/pixels', 'A grid of pixels sold once, at a dollar a piece.',           'pixel',       102400,  99800, '2024-11-02', true,  null),
  ('ShipBoard',          'https://example.com/ship',   'A leaderboard of makers ranked by streak length.',           'leaderboard',  61250,  52300, '2025-03-21', true,  null),
  ('SponsorRow',         'https://example.com/row',    'One sponsor per row, one row per week.',                     'sponsor',      44800,  44100, '2025-02-08', false, null),
  ('HighestBidder',      'https://example.com/hb',     'A single button that belongs to whoever paid the most.',     'bid',          31900,  24600, '2025-05-30', true,  null),
  ('PixelWall',          'https://example.com/wall',   'Ten thousand pixels, resold every quarter.',                 'pixel',        18750,  18400, '2025-04-12', false, null),
  ('StreakRank',         'https://example.com/streak', 'Daily leaderboard for build-in-public streaks.',             'leaderboard',  12300,   8900, '2025-06-18', true,  null),
  ('SoloSponsor',        'https://example.com/solo',   'Exactly one sponsor slot, auctioned monthly.',               'sponsor',       9400,   6100, '2025-07-09', false, null),
  ('BidTheHeadline',     'https://example.com/bth',    'The headline of the page is for sale, always.',              'bid',           5200,   3050, '2025-08-01', false, null),
  ('DotGrid',            'https://example.com/dot',    'A dot costs a dollar. Buying two makes a line.',             'pixel',         2100,    850, '2025-09-15', false, null)
on conflict (url) do nothing;
