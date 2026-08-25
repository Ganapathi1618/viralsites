-- Live visitor counting moved to Datafast, so Supabase no longer tracks it.
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- sites.clicks stays: per-site click counts are the bidding engine's own data,
-- not analytics, and no third party can supply them per listed site.

drop function if exists public.touch_visitor(text);
drop function if exists public.count_visitors();
drop table if exists public.active_visitors;

do $$
begin
  perform cron.unschedule('cleanup-active-visitors');
exception
  when others then null;  -- pg_cron absent, or no such job.
end;
$$;
