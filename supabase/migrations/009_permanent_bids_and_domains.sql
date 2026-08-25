-- Permanent boosts (no expiry) and domain-normalised site lookup.
-- Run this in the Supabase SQL editor. Safe to re-run.

-- ------------------------------------------------------ domain matching ----
/*
 * The bare domain of a URL, lowercased, without scheme, www or trailing slash.
 *
 * Bidders type their site a dozen different ways — "outbid.lol",
 * "https://www.outbid.lol/", "HTTP://Outbid.lol" — and all of them should find
 * the same row. Immutable so it can be indexed.
 */
create or replace function public.normalize_domain(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(lower(coalesce(value, '')), '^\s*https?://', ''),
             '^www\.', ''
           ),
           '/.*$', ''
         );
$$;

create index if not exists sites_domain_idx
  on public.sites (public.normalize_domain(url));

-- ------------------------------------------------------------- ranking -----
/*
 * Boosts are permanent: a bid holds its position until someone outbids it.
 * bid_expires_at stays on the table for the record but no longer affects
 * ranking, so a paid boost never silently disappears.
 */
create or replace view public.sites_ranked as
select
  s.*,
  (s.bid_amount > 0)                                as is_boosted,
  case when s.bid_amount > 0 then 1 else 0 end      as boost_rank,
  case when s.bid_amount > 0 then s.bid_amount
       else 0 end                                   as effective_bid,
  public.normalize_domain(s.url)                    as domain
from public.sites s;

grant select on public.sites_ranked to anon, authenticated;

-- -------------------------------------------------------------- lookup -----
create or replace function public.find_site_by_domain(site_url text)
returns table (id uuid, name text, url text, clicks bigint, bid_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.url, s.clicks, s.bid_amount
  from public.sites s
  where public.normalize_domain(s.url) = public.normalize_domain(site_url)
  limit 1;
$$;

grant execute on function public.find_site_by_domain(text) to anon, authenticated;

-- Clicks match on the domain too, so a link recorded either way still counts.
create or replace function public.increment_site_clicks(site_url text)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.sites
  set clicks = clicks + 1
  where public.normalize_domain(url) = public.normalize_domain(site_url)
  returning clicks;
$$;

grant execute on function public.increment_site_clicks(text) to anon, authenticated;

-- Boosting by domain, for the webhook.
create or replace function public.apply_boost(site_url text, new_bid numeric)
returns uuid
language sql
security definer
set search_path = public
as $$
  update public.sites
  set bid_amount = new_bid
  where public.normalize_domain(url) = public.normalize_domain(site_url)
  returning id;
$$;

grant execute on function public.apply_boost(text, numeric) to service_role;
