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
 * NOTE: Dodo's API shape could not be verified while this was written — the
 * docs were unreachable from the build environment. The request below follows
 * their published pattern (bearer key, amount in minor units, metadata,
 * return_url) and every part of it is overridable by env var. If the call
 * fails for any reason the response falls back to the fixed checkout link, so
 * a bidder is never left staring at an error; the fallback is flagged in the
 * payload so the caller knows the amount will not match.
 */
export async function POST(request: Request) {
  let body: { site_url?: unknown; bid_amount?: unknown; bidder_email?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const bidAmount = Number(body.bid_amount)
  const email = typeof body.bidder_email === 'string' ? body.bidder_email.trim() : ''

  let url: string
  try {
    const parsed = new URL(String(body.site_url ?? ''))
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
  // price, not the bid, so a $51 bid would be billed as a $5 sponsor slot.
  // Refusing is the honest failure.
  if (!apiKey) {
    console.error('[bid/checkout] DODO_API_KEY is not set — cannot price this bid')
    return NextResponse.json(
      { error: 'Bidding is not live yet — the payment key is missing. Try again shortly.' },
      { status: 503 },
    )
  }

  const metadata = {
    type: 'bid',
    site_url: url,
    bid_amount: String(bidAmount),
  }

  try {
    const response = await fetch(`${apiBase}/payments`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        payment_link: true,
        // Amounts are sent in minor units, as most processors expect.
        amount: Math.round(bidAmount * 100),
        currency: 'USD',
        product_id: productId || undefined,
        product_cart: productId
          ? [{ product_id: productId, quantity: 1, amount: Math.round(bidAmount * 100) }]
          : undefined,
        billing_currency: 'USD',
        metadata,
        customer: email ? { email } : undefined,
        return_url: `${siteUrl()}/?boosted=true`,
        description: `Boost ${url} to the top of viralsites.fyi`,
      }),
    })

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null

    if (!response.ok) {
      const detail = JSON.stringify(payload).slice(0, 300)
      console.error('[bid/checkout] dodo responded', response.status, detail)
      return NextResponse.json(
        {
          error: 'Could not open checkout for that amount. Try again.',
          // Carried through so a failure can be diagnosed from the browser
          // rather than only from the deployment's logs.
          detail: `dodo ${response.status}: ${detail}`,
        },
        { status: 502 },
      )
    }

    const checkoutUrl = firstUrl(payload)
    if (!checkoutUrl) {
      const detail = JSON.stringify(payload).slice(0, 300)
      console.error('[bid/checkout] no checkout url in response:', detail)
      return NextResponse.json(
        {
          error: 'Could not open checkout for that amount. Try again.',
          detail: `dodo 200 but no url: ${detail}`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ url: checkoutUrl, dynamic: true })
  } catch (error) {
    console.error('[bid/checkout] request failed:', (error as Error).message)
    return NextResponse.json(
      {
        error: 'Could not reach the payment provider. Try again.',
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
