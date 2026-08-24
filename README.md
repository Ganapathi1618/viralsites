# ViralSites.fyi

A directory of viral one-page money sites — bidding boards, pixel grids,
leaderboards and sponsor boards — ranked by what they earn.

Founders list their site free. Advertisers buy one of six sidebar slots for
$50/month through Stripe. Revenue figures come from public posts on X, or from
the scraper, and are labelled `verified` or `estimated` accordingly.

Next.js 14 (App Router) · Supabase · Stripe · Tailwind · Vercel.

## Layout

Three columns on desktop, with the sidebars fixed and only the middle column
scrolling. Below `lg` everything stacks and the page scrolls normally.

| Column | Contents |
| --- | --- |
| Left (200px) | Sponsor slots 1-3 |
| Middle | Stats bar, top earners strip, the ranked table, footer |
| Right (200px) | Sponsor slots 4-6, submit CTA |

Both rails are pinned to exactly the viewport height below the header and never
scroll — three compact cards plus the CTA fit inside, checked down to a 700px
tall window. The table shows ten rows and pages ten at a time behind a
"Load more" button.

No slot ships pre-filled. An occupied sponsor card means a real paying
advertiser, never a placeholder.

### Sponsor rotation

Paid slots cycle through the occupied positions once every 24 hours, so no
advertiser is stuck at the bottom. The shift is derived from the day number
rather than stored, so it needs no cron and no writes, and every request on a
given day agrees on the order. Open slots stay put, so the layout does not jump
around. `npm run test:rotation` pins the behaviour.

Clicking a table row opens a **drawer** from the right with the full
description, revenue and its source, a model explainer, and a link out.
Submitting happens in a **modal** (and at `/submit` for direct links);
advertising has its own page at **`/advertise`**, which reuses the same
three-column frame via `components/PageShell.tsx`.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

It boots with no environment variables at all: the directory falls back to the
bundled demo data in `lib/demo-data.ts` and the stats bar says
`demo data — Supabase not configured`.

**That fallback fires in exactly one case: no Supabase credentials.** Once the
credentials are set, the real rows are the only source — a failed query shows
an error banner naming the reason, and an empty table shows an empty state.
Neither is quietly replaced with demo rows, because a broken connection that
renders plausible data is indistinguishable from a working one.

### Where the numbers come from

Every figure is a Supabase query, none are hardcoded:

| Element | Query |
| --- | --- |
| Table | `sites` ordered by `revenue_amount` desc, ten rows at a time by offset |
| Header counter | Row count and revenue sum across every row |
| Stats bar | Sum, count, newest by `created_at`, top earner by revenue |
| Top earners strip | First five of the revenue-ordered summary pass |
| Sponsor rails | `ad_slots`, rotated daily |

Totals come from a lightweight second pass (`id,name,url,revenue_amount,
created_at`, capped at 1000 rows) so they cover the whole table rather than the
page on screen. Past a thousand sites, move that to a Postgres view or an RPC
returning the aggregates directly.

Pages after the first are fetched from `/api/sites?offset=&limit=`, so "Load
more" is real offset pagination rather than slicing a preloaded array.

`export const revalidate = 60` on the page means new submissions and scraper
writes appear within a minute, with no redeploy.

### If the page shows demo data on a deployment

`NEXT_PUBLIC_*` variables are inlined **at build time**. Adding them in Vercel
after a deploy does nothing until you redeploy. Check `/api/health` — it
reports which secrets are present and how many rows it can read.

## Supabase

1. Create a project.
2. Open the SQL editor, paste **all of `supabase/schema.sql`**, and Run. It
   creates the three tables, enables RLS, and seeds six ad slots plus ten sites.
   Re-running it is safe.
3. Copy the project URL, anon key and service role key into `.env.local`, and
   into the Vercel project's environment variables.

### Tables

`sites` — `name, url, description, model_type, revenue_amount,
revenue_verified, revenue_source_url, trend_percent, launched_at, is_featured`

`ad_slots` — `position (1-6; 1-3 left rail, 4-6 right), company_name, company_url, one_liner,
stripe_subscription_id, stripe_customer_id, is_active, activated_at,
cancelled_at`

`submissions` — `url, name, one_liner, model_type, revenue_amount,
revenue_source_url, launched_at, submitter_email, status`

`advertise_requests` — `company_name, company_url, one_liner, email, status`

### RLS

- `sites`: public read.
- `ad_slots`: public read of **active slots only**, so a cancelled advertiser's
  details are not served to the browser.
- `submissions` and `advertise_requests`: insert-only for visitors. Nobody can
  read them back, which keeps email addresses private. Reads use the service
  role key.
- Writes to `sites` and `ad_slots` come from the scraper and the Stripe
  webhook, both of which use the service role key and bypass RLS.

## Advertising, and Dodo Payments

Every "Advertise" link and every open sponsor card goes to **`/advertise`**.
The page shows the launch deal ($50 for a month, list price $100), takes the
buyer's site URL, name, one-liner and email, writes an `advertise_requests`
row, and only then sends the browser to the hosted Dodo checkout in the same
tab. Saving first means a started checkout is always recorded, even if the
buyer abandons the payment.

Set `NEXT_PUBLIC_DODO_CHECKOUT_URL` when the Dodo product is recreated; it
falls back to the current link.

**Dodo has no webhook wired up here**, so a completed payment does not fill a
slot on its own. After a payment lands, match it to its `advertise_requests`
row and fill the slot by hand:

```sql
update public.ad_slots
set is_active = true,
    company_name = 'Their name',
    company_url  = 'https://theirsite.com',
    one_liner    = 'Their one-liner.',
    stripe_subscription_id = 'manual',   -- marks the slot as genuinely paid
    activated_at = now()
where position = 4;
```

The `stripe_subscription_id = 'manual'` line matters: a slot renders as a
sponsor only when it carries one, which is what stops seeded or half-filled
rows appearing as advertisers nobody is paying for.

## Stripe

Stripe is still wired up (`/api/checkout` and `/api/stripe/webhook`) but the
advertise page no longer calls it — sponsor slots go through Dodo. Leave it in
place if you may switch back, or delete both routes.

1. Create a **recurring $50/month** price.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_AD_SLOT_PRICE_ID`.
3. Add a webhook to `/api/stripe/webhook` subscribed to
   `checkout.session.completed`, `customer.subscription.deleted` and
   `invoice.payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

A slot is only marked active **by the webhook**, once Stripe confirms payment —
never at checkout time. The advertiser's name, URL and one-liner ride along in
the session metadata, so the slot fills itself. Cancellations and failed
invoices release the slot automatically.

Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## The scraper

`lib/scraper/parse.ts` reads **outbid.lol** and **outbid.fyi** using three
strategies in order: Next.js data payloads (`__NEXT_DATA__` and streamed
`self.__next_f` chunks), JSON-LD `ItemList` blocks, then a regex sweep over
anchors paired with a nearby dollar amount. The first strategy that yields rows
wins; anything unparseable is skipped rather than guessed at.

Scraped rows are always written `revenue_verified: false` — a number lifted off
a page is an estimate until a human attaches a public source. `trend_percent` is
recomputed from the previous and current readings, so the trend column always
compares two real numbers.

Neither source publishes an API or versions its markup, so all three strategies
can break at once. When that happens the run reports `scraped: 0` with an
explanatory `error` instead of quietly succeeding — worth alerting on.

```bash
npm run test:scraper   # fixture tests for all three strategies
npm run scrape         # a real scrape against the configured sources
```

`/api/cron/scrape` requires `Authorization: Bearer $CRON_SECRET` in production,
and refuses to run there at all if `CRON_SECRET` is unset — so a half-configured
deploy cannot leave the endpoint open.

## Deploying to Vercel

1. Import the repo (Add New → Project → Import). The app is the repo root, so
   leave Root Directory as `./`.
2. Add every variable from `.env.example` to the project environment.
3. Deploy.

### Cron: why daily here, six-hourly on GitHub

`vercel.json` schedules `0 3 * * *` — once a day.

**The Hobby plan allows one cron run per day, and Vercel rejects the entire
deployment if `vercel.json` asks for more** ("Hobby accounts are limited to
daily cron jobs"). A `0 */6 * * *` expression fails the build outright.

So the six-hour cadence lives in `.github/workflows/scrape.yml`, which curls the
same authenticated endpoint on GitHub's scheduler. Add two repository secrets
under Settings → Secrets and variables → Actions:

| Secret | Value |
| --- | --- |
| `SITE_URL` | the deployment URL, e.g. `https://viralsites.vercel.app` |
| `CRON_SECRET` | the same value set in Vercel |

Both paths hit the same endpoint and are safe to run together — a scrape is
idempotent. On Pro, set `vercel.json` back to `0 */6 * * *` and delete the
workflow.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser-safe read key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only writes (scraper, webhook) |
| `STRIPE_SECRET_KEY` | for payments | Checkout sessions |
| `STRIPE_AD_SLOT_PRICE_ID` | for payments | The $50/month recurring price |
| `STRIPE_WEBHOOK_SECRET` | for payments | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | no | Only if you replace hosted Checkout with Stripe.js |
| `NEXT_PUBLIC_DODO_CHECKOUT_URL` | no | Hosted Dodo checkout; falls back to the current link |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | no | Loads the Umami script when set |
| `NEXT_PUBLIC_UMAMI_SRC` | no | Script URL; defaults to Umami Cloud |
| `UMAMI_API_URL` | no | API base; defaults to Umami Cloud |
| `UMAMI_API_KEY` | no | Server-only, powers the online badge |
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute URLs for redirects and metadata |
| `CRON_SECRET` | yes in prod | Guards `/api/cron/scrape` |
| `SCRAPER_SOURCE_URLS` | no | Comma-separated; defaults to outbid.lol,outbid.fyi |

## Analytics and the live counter

Optional, and off unless configured. Set `NEXT_PUBLIC_UMAMI_WEBSITE_ID` and the
tracking script loads; leave it unset and local and preview builds send nothing.

The header's "● X online now" badge reads Umami's realtime API through
`/api/online`, so `UMAMI_API_KEY` stays on the server — that endpoint is not
CORS-open to browsers and the key must never ship to one. The badge renders
nothing at all until a number arrives, so a missing or failing Umami setup
leaves no empty chrome behind.

Umami has returned the active-visitor figure in several shapes across versions,
so the response is parsed leniently (`5`, `{x:5}`, `[{x:5}]`, `{visitors:5}`)
and anything unrecognised becomes `null`. **This has not been verified against a
live Umami account** — the sandbox this was built in cannot reach it. If the
badge stays hidden with a key set, `curl /api/online` and check the `reason`.

Self-hosting: point `NEXT_PUBLIC_UMAMI_SRC` and `UMAMI_API_URL` at your
instance.

## Design

White (`#ffffff`), `#f5f5f5` fills, `#ebebeb` borders, `#0066ff` for actions and
`#16a34a` for money. Inter for text, JetBrains Mono for every number — both
self-hosted via `next/font`, so there is no runtime font request. No dark mode,
no gradients, one shadow (on modals). Tokens live in `tailwind.config.ts`;
component classes (`.card`, `.field`, `.btn-primary`, `.num`) in
`app/globals.css`.

## Derived numbers, and what they actually mean

Every stat-bar figure is now a direct aggregate of `sites`. One thing remains
derived: the drawer's **revenue movement** shows two points — today's figure and
the previous one implied by `trend_percent` — because the schema stores a
current figure and a trend, not a time series. It is labelled as such rather
than drawn as a history.

A `revenue_history` table would make it exact. Worth adding once the scraper has
run long enough to have a history to store.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Scraper and rotation tests |
| `npm run test:scraper` | Parser fixture tests |
| `npm run test:rotation` | Sponsor rotation tests |
| `npm run scrape` | One-off scrape, same code path as the cron |

## A note on the numbers

Revenue is self-reported or scraped from public pages. Nothing here is audited.
A `✓` means someone checked the figure against a public post — not that it is
guaranteed.
