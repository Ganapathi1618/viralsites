# ViralSites.fyi

A directory of viral one-page money sites — what they charge for, what they
earn, and how fast they got there.

Next.js 14 (App Router) · Supabase · Stripe · Tailwind · deploys to Vercel.

## What's in it

| Page | What it does |
| --- | --- |
| `/` | Ranked directory, stats bar, sponsor sidebar, leaderboard sidebar, filter by model type |
| `/submit` | Submit a site — writes to the `submissions` table |
| `/advertise` | Buy one of six sidebar slots at $50/month through Stripe Checkout |

Plus a scraper that pulls listings from `outbid.lol` every six hours and keeps
`sites` up to date.

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

It boots without any environment variables. Supabase, Stripe and the scraper
each degrade on their own: with no `NEXT_PUBLIC_SUPABASE_URL` the directory
renders bundled demo data (`lib/demo-data.ts`) and the stats bar says
`demo data` instead of `live`; with no Stripe keys the claim-slot buttons
return a clear "not configured" message rather than failing silently.

## Supabase

1. Create a project.
2. Paste `supabase/schema.sql` into the SQL editor and run it. It creates
   `sites`, `ad_slots` and `submissions`, enables RLS, and seeds six ad slots
   (three sold, three open) plus ten demo sites.
3. Put the project URL and anon key in `.env.local`, plus the service role key
   — the scraper and the Stripe webhook need it to write.

RLS is set up so anonymous visitors can read `sites` and `ad_slots`, insert into
`submissions`, and read nothing back out of it. Writes to `sites` and `ad_slots`
only happen through the service role key on the server.

### Schema notes

`sites` carries one column beyond the obvious ones: `prev_revenue`, the reading
from the previous scrape. The trend column in the UI is derived from the two,
so it compares real readings rather than a value stored by hand. The scraper
only moves `prev_revenue` when revenue actually changes, so a site that has been
flat for three runs still shows its last real move instead of `0.0%`.

## Stripe

1. Create a **recurring** $50/month price for the ad slot.
2. Set `STRIPE_SECRET_KEY` and `STRIPE_AD_SLOT_PRICE_ID`.
3. Add a webhook endpoint pointing at `/api/stripe/webhook` and subscribe it to
   `checkout.session.completed`, `customer.subscription.deleted` and
   `invoice.payment_failed`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

The slot is not marked filled at checkout time — only when the webhook confirms
the payment. A cancelled or failed subscription puts the slot back on the
market automatically. Slot copy (company name, one line, URL) is filled in by
hand after the sale; the webhook parks the slot as "Reserved" until then.

Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## The scraper

`lib/scraper/outbid.ts` parses the source with three strategies, in order:
Next.js data payloads (`__NEXT_DATA__` and streamed `self.__next_f` chunks),
JSON-LD `ItemList` blocks, then a regex sweep over anchors paired with a nearby
dollar amount. Whichever produces rows first wins, and anything unparseable is
skipped rather than guessed at.

`outbid.lol` publishes no API and does not version its markup, so all three
strategies can go stale at once. When that happens the run reports
`scraped: 0` with an explanatory `error` instead of quietly succeeding — worth
alerting on.

```bash
npm run test:scraper   # fixture tests for all three strategies
npm run scrape         # run a real scrape against SCRAPER_SOURCE_URL
```

`/api/cron/scrape` requires `Authorization: Bearer $CRON_SECRET` in production.
With no `CRON_SECRET` set it refuses to run in production and allows local
calls, so a half-configured deploy cannot leave the endpoint open.

## Deploying to Vercel

1. Import the repo. If it lives in a subdirectory, set the project's **Root
   Directory** to that folder.
2. Add every variable from `.env.example` to the project's environment.
3. Deploy. `vercel.json` registers the cron:

   ```json
   { "crons": [{ "path": "/api/cron/scrape", "schedule": "0 */6 * * *" }] }
   ```

   Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once
   `CRON_SECRET` is set on the project.

   **The Hobby plan only allows one cron run per day.** For a true six-hour
   cadence, either upgrade to Pro or use the included GitHub Actions workflow
   (`.github/workflows/scrape.yml`), which curls the same endpoint on a
   schedule. It needs the `SITE_URL` and `CRON_SECRET` repository secrets, and
   it only runs if this project is the repository root.

## Design

`#0a0a0a` background, `#00ff88` accent, JetBrains Mono for every number and
Inter for text — both self-hosted through `next/font`, so there is no runtime
font request. Tokens live in `tailwind.config.ts`; component classes (`.panel`,
`.field`, `.btn-primary`, `.num`) live in `app/globals.css`.

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

Revenue figures are self-reported or scraped from public pages. Nothing here is
audited. The `✓` on a row means someone checked the number against a public
source, not that it is guaranteed.
