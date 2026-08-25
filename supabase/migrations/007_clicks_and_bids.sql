-- Click tracking and paid boosting.
-- Run this in the Supabase SQL editor. Safe to re-run.

alter table public.sites add column if not exists clicks         bigint  not null default 0;
alter table public.sites add column if not exists bid_amount     numeric(12,2) not null default 0;
alter table public.sites add column if not exists bid_expires_at timestamptz;

create index if not exists sites_bid_idx
  on public.sites (bid_amount desc, bid_expires_at desc);

-- ------------------------------------------------------------- ranking -----
/*
 * Ranking in one place, so every reader agrees on it.
 *
 * A live boost is a bid above zero that has not expired. Boosted rows sort
 * above everything, highest bid first; the rest fall back to revenue. Doing it
 * in a view keeps offset pagination working — merging two queries in the app
 * would make every page boundary a special case.
 */
create or replace view public.sites_ranked as
select
  s.*,
  (s.bid_amount > 0 and s.bid_expires_at > now()) as is_boosted,
  case when s.bid_amount > 0 and s.bid_expires_at > now()
       then 1 else 0 end                          as boost_rank,
  -- Sort on this, never on bid_amount: an expired bid keeps its number in the
  -- column, and ordering by that would let a lapsed boost outrank organic
  -- sites earning far more.
  case when s.bid_amount > 0 and s.bid_expires_at > now()
       then s.bid_amount else 0 end               as effective_bid
from public.sites s;

grant select on public.sites_ranked to anon, authenticated;

-- -------------------------------------------------------------- clicks -----
-- Counted in Postgres rather than read-then-write, so simultaneous clicks
-- cannot both write back the same +1.
create or replace function public.increment_site_clicks(site_url text)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.sites
  set clicks = clicks + 1
  where url = site_url
  returning clicks;
$$;

grant execute on function public.increment_site_clicks(text) to anon, authenticated;

-- ---------------------------------------------------------------- bids -----
-- What a bidder asked for, before any money confirms it. A boost is only
-- applied to sites when a bid reaches 'paid'.
create table if not exists public.bids (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites(id) on delete cascade,
  amount     numeric(12,2) not null check (amount >= 10),
  email      text,
  status     text not null default 'pending'
               check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bids_created_at_idx on public.bids (created_at desc);
create index if not exists bids_status_idx     on public.bids (status);

alter table public.bids enable row level security;

-- Insert-only for visitors, like the other intake tables: the rows carry an
-- email address, so reads are reserved for the service role.
drop policy if exists "anyone can bid" on public.bids;
create policy "anyone can bid" on public.bids for insert with check (true);
