-- Migration for a database already created from an earlier schema.sql.
-- Widens ad_slots from six positions to nine (7-9 are the right rail) and
-- switches submissions to auto-approve. Safe to re-run.
--
-- Not needed on a fresh database — schema.sql already reflects both changes.

alter table public.ad_slots drop constraint if exists ad_slots_position_check;
alter table public.ad_slots
  add constraint ad_slots_position_check check (position between 1 and 9);

alter table public.submissions alter column status set default 'approved';

insert into public.ad_slots (position, company_name, company_url, one_liner, is_active, activated_at)
values
  (7, 'pixelwall.io', 'https://pixelwall.io', 'Ten thousand pixels, resold quarterly.', true, now()),
  (8, 'rankme.fyi',   'https://rankme.fyi',   'Climb the rank by paying, or shipping.', true, now()),
  (9, null, null, null, false, null)
on conflict (position) do nothing;
