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
| Left (200px) | Six sponsor slots — three filled, three open at $50/mo |
| Middle | Stats bar, filter pills, the ranked table |
| Right (200px) | Top earners, just submitted, this week, submit CTA |

Clicking a table row opens a **drawer** from the right with the full
description, revenue and its source, a model explainer, and a link out.
Submitting and advertising both happen in **modals**; `/submit` and
`/advertise` also exist as standalone pages for direct links.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

It boots with no environment variables at all: the directory falls back to the
bundled demo data in `lib/demo-data.ts` and the stats bar says
`demo data — connect Supabase`. Stripe and the scraper degrade the same way,
each returning a clear "not configured" message rather than failing silently.

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

`ad_slots` — `position (1-6), company_name, company_url, one_liner,
stripe_subscription_id, stripe_customer_id, is_active, activated_at,
cancelled_at`

`submissions` — `url, name, one_liner, model_type, revenue_amount,
revenue_source_url, launched_at, submitter_email, status`

### RLS

- `sites`: public read.
- `ad_slots`: public read of **active slots only**, so a cancelled advertiser's
  details are not served to the browser.
- `submissions`: insert-only for visitors. Nobody can read them back, which
  keeps submitter emails private. Moderation uses the service role key.
- Writes to `sites` and `ad_slots` come from the scraper and the Stripe
  webhook, both of which use the service role key and bypass RLS.

## Stripe

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
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute URLs for Stripe redirects and metadata |
| `CRON_SECRET` | yes in prod | Guards `/api/cron/scrape` |
| `SCRAPER_SOURCE_URLS` | no | Comma-separated; defaults to outbid.lol,outbid.fyi |

## Design

White (`#ffffff`), `#f5f5f5` fills, `#ebebeb` borders, `#0066ff` for actions and
`#16a34a` for money. Inter for text, JetBrains Mono for every number — both
self-hosted via `next/font`, so there is no runtime font request. No dark mode,
no gradients, one shadow (on modals). Tokens live in `tailwind.config.ts`;
component classes (`.card`, `.field`, `.btn-primary`, `.num`) in
`app/globals.css`.

## Derived numbers, and what they actually mean

The schema stores a current revenue figure and a trend, not a time series. Three
things in the UI are therefore derived, and are approximations by construction:

- **Top earner this week** — the largest implied gain (`revenue × trend%`). It
  ranks momentum, not audited weekly takings.
- **Earned this week** — the sum of those implied gains.
- **Went viral** — sites whose revenue moved 25% or more since the last reading.
- **Revenue movement** (in the drawer) — two points: today's figure, and the
  previous one implied by the trend. Not a full history, and labelled as such.

Storing a `revenue_history` table would make all four exact. Worth doing once
the scraper has been running long enough to have a history to store.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:scraper` | Parser fixture tests |
| `npm run scrape` | One-off scrape, same code path as the cron |

## A note on the numbers

Revenue is self-reported or scraped from public pages. Nothing here is audited.
A `✓` means someone checked the figure against a public post — not that it is
guaranteed.
