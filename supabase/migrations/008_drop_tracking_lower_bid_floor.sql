-- Removes the Supabase-side tracking tables (analytics moved to Datafast and
-- Umami) and lowers the bid floor to $1.
-- Run this in the Supabase SQL editor. Safe to re-run.

-- ------------------------------------------------------------ tracking -----
drop function if exists public.increment_page_views();
drop function if exists public.touch_visitor(text);
drop function if exists public.count_visitors();

drop table if exists public.page_views;
drop table if exists public.active_visitors;

-- The every-minute sweep has nothing left to sweep.
do $$
begin
  perform cron.unschedule('cleanup-active-visitors');
exception
  when others then null;  -- pg_cron absent, or no such job.
end;
$$;

-- ----------------------------------------------------------- bid floor -----
-- Was $10. A $1 floor makes the first bid trivial to place, and every bid
-- after it only has to beat the one above.
alter table public.bids drop constraint if exists bids_amount_check;
alter table public.bids add constraint bids_amount_check check (amount >= 1);
