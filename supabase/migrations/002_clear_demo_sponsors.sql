-- Clears the placeholder sponsors seeded by earlier versions of schema.sql and
-- drops slots 7-9, leaving six open slots (1-3 left rail, 4-6 right rail).
--
-- Only needed on a database created before this change. Safe to re-run.
--
-- It deliberately leaves any slot with a Stripe subscription id alone, so a
-- real paying advertiser is never wiped out by this cleanup.

delete from public.ad_slots
where position > 6
  and stripe_subscription_id is null;

update public.ad_slots
set is_active    = false,
    company_name = null,
    company_url  = null,
    one_liner    = null,
    activated_at = null
where stripe_subscription_id is null;

insert into public.ad_slots (position, company_name, company_url, one_liner, is_active)
values (1, null, null, null, false),
       (2, null, null, null, false),
       (3, null, null, null, false),
       (4, null, null, null, false),
       (5, null, null, null, false),
       (6, null, null, null, false)
on conflict (position) do nothing;
