import { NextResponse } from 'next/server'
import { describeKeys, firstUrl } from '@/lib/dodo'
import { normalizeDomain } from '@/lib/domain'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'
import { siteUrl } from '@/lib/stripe'
import { MIN_BID_USD } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SiteMatch = { id: string; url: string; bid_amount?: number | null }

/**
 * Opens a Dodo payment link priced at exactly the bid.
 *
 * `amount` is what makes the bid dynamic: the product supplies the SKU, the
 * cart line overrides its price in cents, so one product can charge $1 or
 * $500 without a new product per amount.
 *
 * The metadata is what makes the boost automatic — the webhook reads
 * `type: 'bid'` and `site_url` back and applies the boost to that site,
 * rather than guessing which pending row a payment belongs to.
 */
export async function POST(request: Request) {
  let input: { site_url?: unknown; bid_amount?: unknown; bidder_email?: unknown }
  try {
    input = (await request.json()) as typeof input
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const bidAmount = Number(input.bid_amount)
  const email = typeof input.bidder_email === 'string' ? input.bidder_email.trim() : ''

  // Only the domain is ever matched on, so scheme, www and a trailing slash
  // are all noise. Anything that leaves a domain behind is accepted.
  const domain = normalizeDomain(input.site_url)
  if (!domain || !domain.includes('.')) {
    return NextResponse.json({ error: 'Enter the site you want to boost.' }, { status: 400 })
  }
  const url = `https://${domain}`

  if (!Number.isFinite(bidAmount) || bidAmount < MIN_BID_USD) {
    return NextResponse.json({ error: `The minimum bid is $${MIN_BID_USD}.` }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 })
  }

  const reader = getSupabaseAdmin() ?? getSupabase()

  if (reader) {
    const site = await findSite(reader, domain)

    // A site we cannot find is never a reason to refuse money. The webhook
    // matches on the domain again when the payment lands and is the authority
    // on what actually gets boosted, so a lookup that comes up empty here —
    // an unlisted site, a stale replica, an outage — costs the bidder nothing.
    if (site) {
      // The bid has to beat whatever boost is live, checked here and not only
      // in the browser.
      const { data: top, error: topError } = await reader
        .from('sites_ranked')
        .select('effective_bid')
        .order('effective_bid', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (topError) {
        console.error('[bid/checkout] top-bid lookup failed:', topError.message)
      } else {
        const topBid = Number(top?.effective_bid ?? 0)
        if (bidAmount <= topBid) {
          return NextResponse.json(
            { error: `Your bid must beat the current top bid of $${topBid}.` },
            { status: 409 },
          )
        }
      }

      // Record the intent before sending anyone to a payment page, so an
      // abandoned checkout still leaves a trace.
      const writer = getSupabaseAdmin() ?? reader
      const { error } = await writer
        .from('bids')
        .insert({ site_id: site.id, amount: bidAmount, email: email || null, status: 'pending' })

      if (error) console.error('[bid/checkout] could not record the bid:', error.message)
    } else {
      console.warn('[bid/checkout] no listed site matched', domain, '— continuing to checkout')
    }
  }

  const apiKey = process.env.DODO_API_KEY?.trim()
  const productId = process.env.DODO_BID_PRODUCT_ID?.trim()
  const apiBase = (process.env.DODO_API_URL || 'https://live.dodopayments.com').replace(/\/$/, '')

  // Never hand a bidder the fixed sponsor-slot link: it charges that product's
  // price, not the bid. Refusing is the honest failure.
  if (!apiKey) {
    console.error('[bid/checkout] DODO_API_KEY is not set — cannot price this bid')
    return NextResponse.json(
      { error: 'Bidding is not live yet — the payment key is missing.' },
      { status: 503 },
    )
  }

  if (!productId) {
    console.error('[bid/checkout] DODO_BID_PRODUCT_ID is not set')
    return NextResponse.json(
      { error: 'Bidding is not live yet — the product is not configured.' },
      { status: 503 },
    )
  }

  const body = {
    // Dodo requires a billing block even for a digital product nobody ships.
    billing: { city: 'NA', country: 'US', state: 'NA', street: 'NA', zipcode: '00000' },
    customer: { email, name: 'Bidder' },
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
        // Cents, so $12 is 1200. Rounded because a stray float would be
        // rejected by the API.
        amount: Math.round(bidAmount * 100),
      },
    ],
    payment_link: true,
    metadata: {
      // Metadata values must be strings; the webhook parses these back.
      site_url: url,
      bid_amount: String(bidAmount),
      type: 'bid',
    },
    return_url: `${siteUrl()}/?boosted=true`,
  }

  try {
    const response = await fetch(`${apiBase}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify(body),
    })

    const raw = await response.text()
    // Logged whole: this is the one call whose exact answer matters, and it
    // cannot be exercised from anywhere but the deployment.
    console.log('[bid/checkout] dodo', response.status, raw.slice(0, 1000))

    let payload: Record<string, unknown> | null = null
    try {
      payload = JSON.parse(raw) as Record<string, unknown>
    } catch {
      payload = null
    }

    // The key names on their own line. The body above can be truncated or
    // noisy; this is the one thing needed to fix a rename, so it is logged
    // where it cannot be cut off.
    if (payload) console.log('[bid/checkout] dodo response keys:', describeKeys(payload))

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Could not open checkout for that amount.',
          detail: `dodo ${response.status}: ${raw.slice(0, 300)}`,
        },
        { status: 502 },
      )
    }

    const checkoutUrl = firstUrl(payload)
    if (!checkoutUrl) {
      // Names the keys that did come back, so the fix is reading one line
      // rather than reproducing the payment.
      const keys = payload ? describeKeys(payload) : 'response was not JSON'
      console.error('[bid/checkout] no payment link in the response. keys:', keys)

      return NextResponse.json(
        {
          error: 'Could not open checkout for that amount.',
          detail: `dodo ${response.status} but no payment link. keys: ${keys}`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error('[bid/checkout] request failed:', (error as Error).message)
    return NextResponse.json(
      {
        error: 'Could not reach the payment provider.',
        detail: `request failed: ${(error as Error).message}`,
      },
      { status: 502 },
    )
  }
}

/**
 * Finds the listed site for a domain.
 *
 * The RPC does the matching in Postgres, which is the same comparison the
 * webhook uses. The view query is a fallback for a deployment where migration
 * 009 has not been run yet: without it the RPC does not exist, and a missing
 * function must not look like a missing site.
 */
async function findSite(
  client: NonNullable<ReturnType<typeof getSupabase>>,
  domain: string,
): Promise<SiteMatch | null> {
  const { data, error } = await client.rpc('find_site_by_domain', { site_url: domain })

  if (!error) {
    const match = (Array.isArray(data) ? data[0] : data) as SiteMatch | null
    if (match) return match
  } else {
    console.error('[bid/checkout] find_site_by_domain failed:', error.message)
  }

  const { data: rows, error: viewError } = await client
    .from('sites_ranked')
    .select('id,url,bid_amount,domain')
    .eq('domain', domain)
    .limit(1)

  if (viewError) {
    console.error('[bid/checkout] domain lookup failed:', viewError.message)
    return null
  }

  return (rows?.[0] as SiteMatch | undefined) ?? null
}
