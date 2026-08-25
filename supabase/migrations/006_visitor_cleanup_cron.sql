-- Sweeps active_visitors once a minute, and tightens the live window to two
-- minutes. Run this in the Supabase SQL editor. Safe to re-run.
--
-- The app already sweeps on every heartbeat, so this is a backstop: without
-- it, rows linger in the table between visits — harmless, since the count
-- filters by timestamp, but confusing when browsing the table editor.

-- ---------------------------------------------------------------- window ---
create or replace function public.touch_visitor(visitor_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  live integer;
begin
  delete from public.active_visitors where last_seen < now() - interval '2 minutes';

  insert into public.active_visitors (id, last_seen)
  values (visitor_id, now())
  on conflict (id) do update set last_seen = now();

  select count(*) into live from public.active_visitors;
  return live;
end;
$$;

create or replace function public.count_visitors()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.active_visitors
  where last_seen > now() - interval '2 minutes';
$$;

grant execute on function public.touch_visitor(text) to anon, authenticated;
grant execute on function public.count_visitors() to anon, authenticated;

-- ------------------------------------------------------------- one-off -----
-- Clear whatever is already stale, so the table is clean immediately rather
-- than after the next visitor arrives.
delete from public.active_visitors where last_seen < now() - interval '2 minutes';

-- ---------------------------------------------------------------- cron -----
-- pg_cron must be enabled for the project: Database -> Extensions -> pg_cron,
-- or the create extension below if your role may install it.
create extension if not exists pg_cron;

-- Unschedule first so re-running this file does not stack duplicate jobs.
do $$
begin
  perform cron.unschedule('cleanup-active-visitors');
exception
  when others then null;  -- No such job yet, which is fine.
end;
$$;

select cron.schedule(
  'cleanup-active-visitors',
  '* * * * *',
  $$delete from public.active_visitors where last_seen < now() - interval '2 minutes'$$
);
