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
The page shows the launch offer — **$5 for 5 days** against a struck-through
$50/month, with a live countdown to `LAUNCH_ENDS_AT` — takes the buyer's site
URL, name, one-liner and email, writes an `advertise_requests` row, and only
then sends the browser to the hosted Dodo checkout in the same tab. Saving
first means a started checkout is always recorded, even if the buyer abandons
the payment.

The launch price is a **one-off payment for five days, not a subscription**.
When it ends, change `LAUNCH_PRICE_USD` / `LAUNCH_DAYS` in `lib/types.ts` and
point `NEXT_PUBLIC_DODO_CHECKOUT_URL` at the $50/month product. The countdown
switches itself to "the launch price has ended" once the date passes, so a
missed deadline degrades quietly rather than advertising a stale offer.

### The announcement ticker

`components/Ticker.tsx` scrolls above the header. The message list is
duplicated and the track slides by exactly half its width, which is what makes
the loop seamless; it pauses on hover and stops entirely under
`prefers-reduced-motion`. Dismissal is remembered in `sessionStorage`, so it
returns on the visitor's next visit but not on their next page view.

The ticker is `fixed`, so its height drives a `--banner-h` CSS variable on the
shell. The header offset, the content padding and the sidebars' viewport-height
maths all read that one variable, so they cannot drift apart when it is
dismissed.

Its "N viral sites tracked" line comes from the real count rather than a
hardcoded number, and disappears entirely at zero — a hardcoded "100+" would
contradict the header's live figure sitting two inches below it, and a failed
database read would otherwise scroll "0 viral sites tracked" across the page.

Set `NEXT_PUBLIC_DODO_CHECKOUT_URL` when the Dodo product is recreated; it
falls back to the current link.

### The webhook

`/api/webhooks/dodo` fills a slot automatically. On `payment.succeeded` or
`subscription.active` it takes the most recent `pending` advertise_request,
puts it in the lowest-numbered free slot, marks it active, and sets the request
to `paid`.

Set `DODO_WEBHOOK_SECRET` and point Dodo at
`https://your-site/api/webhooks/dodo`. **Without the secret the route returns
503 and fills nothing** — it will not accept an unverified payment event.

Signatures follow the Standard Webhooks spec: the signed content is
`id.timestamp.body`, HMAC-SHA256, base64. The raw body is read before anything
parses it, since the signature covers those exact bytes. Requests older than
five minutes are rejected as replays, and several space-separated signatures
are accepted so a secret rotation does not drop events.
`npm run test:webhook` covers every rejection path — wrong secret, tampered
body, swapped id, stale timestamp, missing headers.

**Pairing is a heuristic.** Dodo's hosted checkout carries no reference back to
the row written before redirecting, so there is nothing to join on and "most
recent pending" is the best available match. It is correct when buyers arrive
one at a time and can mismatch if two people check out in the same moment — the
email on each request is what to reconcile against.

Two things the webhook does not do: it never refunds or queues a payment that
arrives when every slot is full (it logs and returns `filled: false`), and it
sets no expiry, so a $5 five-day slot stays live until it is cleared by hand.

### Filling a slot manually

If you take a payment outside the webhook:

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

Sources by default: **outbid.lol**, **outbid.fyi**, **outbidstory.lol** and
**outbid-directory.lol** (override with `SCRAPER_SOURCE_URLS`). A source that
404s or blocks the bot is recorded as a per-source error and the run continues.

Each source gets two passes.

**Listings** — three strategies in order: Next.js data payloads (`__NEXT_DATA__`
and streamed `self.__next_f` chunks), JSON-LD `ItemList` blocks, then a regex
sweep over anchors paired with a nearby dollar amount. First one to yield rows
wins; anything unparseable is skipped rather than guessed at. These carry name,
description and revenue.

**Discovery** — every `.lol` domain the page links to, as bare hostnames. New
ones are inserted as `model_type: 'bid'` with `revenue_amount: 0` and no
description, waiting for a listing parse or a human to give them numbers. This
pass is deliberately dumber and therefore much harder to break: when a source
redesigns and the listing parsers go quiet, new boards still get found.

Deduplication is by hostname, so the same board stored as `http` or with a
trailing slash is not inserted twice. Discovery inserts are capped at 100 per
run so a source that suddenly links out to hundreds of hosts cannot flood the
table in one pass.

Everything written is `revenue_verified: false` — a number lifted off a page is
an estimate, and a discovered domain has no number at all. `trend_percent` is
recomputed from the previous and current readings, so the trend column always
compares two real numbers.

None of these sources publish an API or version their markup. When a run finds
nothing anywhere it reports `scraped: 0, discovered: 0` with an explanatory
`error` instead of quietly succeeding — worth alerting on.

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

`vercel.json` schedules `0 3 * * *` — once a day, and that is not an oversight.

**The Hobby plan allows one cron run per day, and Vercel rejects the entire
deployment if `vercel.json` asks for more** ("Hobby accounts are limited to
daily cron jobs"). A `0 */6 * * *` expression fails the build outright, so
setting it would take the site down rather than scrape more often.

The six-hour cadence therefore lives in `.github/workflows/scrape.yml`, which
curls the same authenticated endpoint on GitHub's scheduler — same result, no
plan limit. Add two repository secrets under Settings → Secrets and variables →
Actions:

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
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute URLs for redirects and metadata |
| `DATAFAST_API_KEY` | for header stats | Website settings → API on datafa.st; server-only |
| `DATAFAST_API_URL` | no | Defaults to `https://datafa.st/api/v1` |
| `CRON_SECRET` | yes in prod | Guards `/api/cron/scrape` and `/api/diagnostics` |
| `SCRAPER_SOURCE_URLS` | no | Comma-separated; defaults to outbid.lol,outbid.fyi |

## Analytics

**Datafast is the only analytics.** The tag sits in `<head>`
(`app/layout.tsx`) and the header's `N online · N visitors · N views` figures
are read back from [Datafast's API](https://datafa.st/docs/api-introduction)
by `/api/stats`, cached 30 seconds, polled by `TrafficBadge` every 30.

`DATAFAST_API_KEY` is server-only and deliberately has no `NEXT_PUBLIC_`
prefix: it can read every visitor record for this site. Without it the route
answers with nulls and a `reason`, and the header shows the site count and the
"Full stats ↗" link alone — never a zero standing in for a number nobody
measured.

An earlier version tried to scrape the public share page instead. That page
renders its figures in the browser, so a server fetch got markup with no
numbers in it and every badge silently vanished. The share page is a dashboard
for humans; the API is the contract. It is still what "Full stats ↗" opens.

Two calls, in parallel:

```
GET /api/v1/analytics/realtime?websiteId=…                       → live
GET /api/v1/analytics/overview?startAt=…&endAt=…&websiteId=…     → visitors, pageviews
```

The overview window is a **rolling** 30 days. A fixed range would keep
reporting the same month forever, so the header would quietly stop moving a few
weeks after launch.

### Field names are matched, not assumed

The endpoints are confirmed; their field names are not, and datafa.st is
unreachable from the environment this was written in. `lib/datafast.ts`
searches each payload breadth-first for any of several plausible key names
(`visitors`, `uniqueVisitors`, `unique_visitors`, …). Breadth-first matters: a
window total at the top level has to win over the same key inside a per-day
breakdown, or the header would report one day as the month.

`scripts/test-datafast.ts` pins both failure modes — reading a daily figure as
the total, and inventing a number where the payload has none.
`GET /api/diagnostics?key=$CRON_SECRET` returns both raw bodies plus what the
header currently resolves to, so an unexpected shape is one request away from
being fixed rather than a guessing loop.

Supabase does not track visitors at all — `active_visitors` and `page_views`
are gone. `011_drop_visitor_tracking.sql` removes them from a database that
still has them.

**`sites.clicks` is the exception, and deliberately so.** Per-site click counts
are the bidding engine's own data, not analytics: Datafast counts events on
this domain, so getting a number for each of hundreds of listed sites would
mean a goal configured per site, and it still could not feed ranking or be
shown to a bidder as what their money bought. That counter stays in Postgres.

## Clicks and paid boosting

**Clicks** are counted on every outbound link — the site name in the table, the
top-earner cards and the drawer's Visit button. The request is fired with
`keepalive` and never awaited, so a slow counter cannot delay the navigation
the visitor actually asked for. `increment_site_clicks()` does the arithmetic
in Postgres, so simultaneous clicks cannot both write back the same +1.

**Boosting** lets a site buy the top of the table for 24 hours.

Ranking lives in the `sites_ranked` view rather than the app, so every reader
agrees on it and offset pagination keeps working — merging two queries would
make every page boundary a special case.

**Boosts are permanent.** A bid holds its position until someone outbids it;
getting outbid drops the rank but keeps the boost. `bid_expires_at` remains on
the table for the record but no longer affects ranking, so a paid boost never
silently disappears.

### Ranking, and how fast a paid bid shows

Boosted rows sort above everything, highest bid first; the rest fall back to
revenue. `sites_ranked` is the authority and every reader goes through it, so
the order cannot differ between the homepage, "Load more" and search.

This is proved rather than asserted. The rule was run against a real Postgres
16 on a deliberately awkward board — the biggest earner unbid, the smallest
earner holding the biggest bid, one bid long expired — and `byRank` in
`lib/data.ts` is the TypeScript copy the demo fallback uses, pinned to that
same fixture by `scripts/test-ranking.ts`. A $1 bid outranks a $500,000
earner: rank is bought, not earned, and that is the product.

**A paid boost appears immediately, not in 60 seconds.** The homepage is ISR
with `revalidate = 60`, so on its own a site that just bought #1 would keep its
old rank for up to a minute — right as the bidder is being redirected back,
which reads as the payment having failed. The webhook calls `revalidatePath('/')`
after applying the boost, and the bidder's return to `?boosted=true` triggers a
`router.refresh()`, so the new order is there when they land.

### Search

Filtering runs in Postgres, over every row, through the same ranked view. The
table pages ten at a time, so a browser-side filter would only search what is
already on screen and would tell someone their site is missing when it is on
page three. `%`, `,`, `(`, `)` and `\` are stripped from the term before it
reaches the PostgREST `or` filter, where they are syntax.

When nothing matches, the empty state offers **Add + Bid** rather than a dead
end: that is the moment someone is most likely to pay, since they came looking
for their own site. The route inserts the row unboosted, then opens checkout
for the bid, so what the webhook boosts already exists when the payment lands.
If the row cannot be created — no service-role key — it refuses rather than
taking money for a boost with nothing to apply it to.

### Matching a site by domain

Bidders type their site every way imaginable — `outbid.lol`,
`https://outbid.lol`, `https://www.outbid.lol/`. `normalize_domain()` reduces
all of those to `outbid.lol`, and lookups, click counting and boosting all
match on it. The column is indexed on that expression, so it stays a single
index scan. `normalizeDomain()` in `lib/domain.ts` does the same reduction in
JavaScript, so the route, the webhook and Postgres always agree on what counts
as the same site.

**A bid is never refused for not matching a row.** The lookup exists to record
the intent and to price the floor; if it comes up empty — an unlisted site, a
missing migration, an outage — checkout still opens, because the webhook
re-matches the domain when the payment lands and is the authority on what gets
boosted. Refusing money over a failed `select` is how "that site is not listed"
used to happen.

`/api/bid/checkout` records the intent, then opens a Dodo checkout **for the
exact bid amount**, carrying `{type: 'bid', site_url, bid_amount}` in metadata.
The webhook reads that back and boosts precisely that site — no guessing which
pending row a payment belongs to, which is what the sponsor-slot flow still has
to do.

**Nothing in the app boosts a site.** Only the webhook sets `bid_amount` and
`bid_expires_at`, so nobody reaches the top of the board by calling an
endpoint. A bid must clear $1 and beat the highest live bid, checked
server-side as well as in the modal.

### The Dodo call

`POST https://live.dodopayments.com/payments`, bearer key, with:

```json
{
  "billing": { "city": "NA", "country": "US", "state": "NA", "street": "NA", "zipcode": "00000" },
  "customer": { "email": "…", "name": "Bidder" },
  "product_cart": [{ "product_id": "…", "quantity": 1, "amount": 1200 }],
  "payment_link": true,
  "metadata": { "site_url": "…", "bid_amount": "12", "type": "bid" },
  "return_url": "https://viralsites.fyi/?boosted=true"
}
```

`amount` is in cents and is what makes one product charge any bid: the SKU
comes from `DODO_BID_PRODUCT_ID`, the price comes from the cart line. `billing`
is required even though nothing ships. The response's `payment_link` is
returned as `url` and the browser is sent there.

**It never falls back to the fixed sponsor link.** That link charges the
sponsor product's price, not the bid, so a missing `DODO_API_KEY` or
`DODO_BID_PRODUCT_ID` returns 503 and says which one is missing. Dodo's full
response is logged on every attempt, and its status and body come back to the
modal in `detail` — so a rejected bid says what Dodo actually objected to
rather than "something went wrong".

`GET /api/diagnostics?key=$CRON_SECRET` runs the same call against the live
product and reports the raw answer, without needing anyone to attempt a real
bid.

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
