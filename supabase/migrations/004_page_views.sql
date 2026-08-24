-- Site-wide pageview counter for the header badge.
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists public.page_views (
  id          text primary key default 'main',
  total_views bigint not null default 0
);

insert into public.page_views (id, total_views)
values ('main', 0)
on conflict (id) do nothing;

alter table public.page_views enable row level security;

-- Anyone may read the total; it is displayed publicly in the header.
drop policy if exists "page views are public" on public.page_views;
create policy "page views are public" on public.page_views for select using (true);

-- Increments happen through this function rather than a read-then-write from
-- the app: two visitors landing in the same instant would otherwise read the
-- same number and both write back the same +1, losing a view. `security
-- definer` lets it run without granting anonymous visitors update rights on
-- the table itself.
create or replace function public.increment_page_views()
returns bigint
language sql
security definer
set search_path = public
as $$
  insert into public.page_views (id, total_views)
  values ('main', 1)
  on conflict (id) do update set total_views = page_views.total_views + 1
  returning total_views;
$$;

grant execute on function public.increment_page_views() to anon, authenticated;
