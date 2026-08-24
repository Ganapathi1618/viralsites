-- Live visitor count for the header badge.
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists public.active_visitors (
  id        text primary key,
  last_seen timestamptz not null default now()
);

create index if not exists active_visitors_last_seen_idx
  on public.active_visitors (last_seen desc);

alter table public.active_visitors enable row level security;

-- No policies: the table is reached only through the function below, which
-- runs as its owner. Visitors can neither read the raw rows nor forge them
-- directly, and session ids never leave the server.

/*
 * One heartbeat: record this visitor, forget anyone who has gone quiet for
 * five minutes, and return how many are left.
 *
 * All three happen in one statement chain so the route makes a single round
 * trip, and the sweep rides along with the writes rather than needing a cron.
 */
create or replace function public.touch_visitor(visitor_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  live integer;
begin
  insert into public.active_visitors (id, last_seen)
  values (visitor_id, now())
  on conflict (id) do update set last_seen = now();

  delete from public.active_visitors where last_seen < now() - interval '5 minutes';

  select count(*) into live from public.active_visitors;
  return live;
end;
$$;

/* Read-only variant for the initial render and the polling GET. */
create or replace function public.count_visitors()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.active_visitors
  where last_seen > now() - interval '5 minutes';
$$;

grant execute on function public.touch_visitor(text) to anon, authenticated;
grant execute on function public.count_visitors() to anon, authenticated;
