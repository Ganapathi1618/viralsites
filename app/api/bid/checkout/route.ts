import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'
import { siteUrl } from '@/lib/stripe'
import { MIN_BID_USD } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Creates a Dodo checkout for the exact bid amount.
 *
 * The metadata is what makes the boost automatic: the webhook reads
 * `type: 'bid'` and `site_url` back and applies the boost to that site, rather
 * than guessing which pending row a payment belongs to.
 *
 * The request body follows Dodo's documented `POST /payments` shape. Their
 * full response is logged, and its status and body are carried back to the
 * browser in `detail`, because this is the one call whose exact answer matters
 * and it cannot be exercised from the build environment.
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

  let url: string
  try {
    const parsed = new URL(String(input.site_url ?? ''))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
    url = parsed.toString()
  } catch {
    return NextResponse.json({ error: 'Unknown site.' }, { status: 400 })
  }

  if (!Number.isFinite(bidAmount) || bidAmount < MIN_BID_USD) {
    return NextResponse.json({ error: `The minimum bid is $${MIN_BID_USD}.` }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 })
  }

  const reader = getSupabaseAdmin() ?? getSupabase()

  // The bid has to beat whatever boost is live, checked here and not only in
  // the browser.
  if (reader) {
    // Matched on the bare domain, so "outbid.lol", "https://outbid.lol" and
    // "https://www.outbid.lol/" all find the same row.
    const { data: matches, error: lookupError } = await reader.rpc('find_site_by_domain', {
      site_url: url,
    })

    const site = Array.isArray(matches) ? matches[0] : matches

    // Only reject when the lookup succeeded and found nothing. A failed read —
    // an outage, a network blip — must not block a paying bidder, since the
    // webhook is the authority on what actually gets boosted.
    if (lookupError) {
      console.error('[bid/checkout] site lookup failed:', lookupError.message)
    } else if (!site) {
      return NextResponse.json({ error: 'That site is not listed.' }, { status: 404 })
    }

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
    if (site) {
      const writer = getSupabaseAdmin() ?? reader
      const { error } = await writer
        .from('bids')
        .insert({ site_id: site.id, amount: bidAmount, email: email || null, status: 'pending' })

      if (error) console.error('[bid/checkout] could not record the bid:', error.message)
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
    billing: { city: '', country: 'US', state: '', street: '', zipcode: '' },
    customer: { email, name: '' },
    payment_link: true,
    product_cart: [{ product_id: productId, quantity: 1 }],
    metadata: {
      site_url: url,
      // Metadata values must be strings; the webhook parses this back.
      bid_amount: String(bidAmount),
      type: 'bid',
    },
    return_url: `${siteUrl()}?boosted=true`,
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
    // Logged whole: this is the one call whose exact answer matters, and the
    // shape has been guessed at more than once.
    console.log('[bid/checkout] dodo', response.status, raw.slice(0, 1000))

    let payload: Record<string, unknown> | null = null
    try {
      payload = JSON.parse(raw) as Record<string, unknown>
    } catch {
      payload = null
    }

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
      return NextResponse.json(
        {
          error: 'Could not open checkout for that amount.',
          detail: `dodo 200 but no payment link: ${raw.slice(0, 300)}`,
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

/** Dodo has used several names for this field; accept whichever comes back. */
function firstUrl(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null

  for (const key of ['payment_link', 'checkout_url', 'url', 'link', 'payment_url']) {
    const value = payload[key]
    if (typeof value === 'string' && /^https?:\/\//.test(value)) return value
  }

  return null
}
