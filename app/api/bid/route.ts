import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'
import { MIN_BID_USD } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Records an intended bid before the bidder is sent to Dodo.
 *
 * Nothing here boosts anything: the row is written `pending` and only the
 * payment webhook promotes it. Writing first means an abandoned checkout still
 * leaves a trace, and — more importantly — that nobody can boost a site by
 * calling this endpoint.
 */
export async function POST(request: Request) {
  let body: { site_id?: unknown; amount?: unknown; email?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const siteId = String(body.site_id ?? '')
  const amount = Number(body.amount)
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!/^[0-9a-f-]{36}$/i.test(siteId)) {
    return NextResponse.json({ error: 'Unknown site.' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount < MIN_BID_USD) {
    return NextResponse.json(
      { error: `The minimum bid is $${MIN_BID_USD}.` },
      { status: 400 },
    )
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin() ?? getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Bidding is not wired up yet.' }, { status: 503 })
  }

  // The bid has to beat whatever boost is currently live.
  const reader = getSupabaseAdmin() ?? getSupabase()
  if (reader) {
    const { data: top } = await reader
      .from('sites_ranked')
      .select('effective_bid')
      .order('effective_bid', { ascending: false })
      .limit(1)
      .maybeSingle()

    const topBid = Number(top?.effective_bid ?? 0)
    if (amount <= topBid) {
      return NextResponse.json(
        { error: `Your bid must beat the current top bid of $${topBid}.` },
        { status: 409 },
      )
    }
  }

  const { error } = await supabase
    .from('bids')
    .insert({ site_id: siteId, amount, email: email || null, status: 'pending' })

  if (error) {
    console.error('[bid] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not record your bid. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
