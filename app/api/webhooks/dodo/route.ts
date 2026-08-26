import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { normalizeDomain } from '@/lib/domain'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/webhook-signature'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Events that mean a sponsor slot has been paid for. */
const PAID_EVENTS = new Set(['payment.succeeded', 'subscription.active'])

/**
 * Dodo Payments webhook.
 *
 * Two flows, split by metadata. A payment carrying `type: 'bid'` boosts the
 * site named in `site_url` and touches nothing else. Anything else is a
 * sponsor slot purchase: it takes the most recent pending
 * advertise_request and fills the lowest-numbered free slot.
 *
 * Pairing by "most recent pending" is a heuristic: Dodo's hosted checkout
 * carries no reference back to the row we wrote before redirecting, so there
 * is nothing to join on. It is right when buyers arrive one at a time and can
 * mismatch if two people check out within the same moment — the email on each
 * request is what to reconcile against if that ever happens.
 */
export async function POST(request: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('[dodo] DODO_WEBHOOK_SECRET is not set — refusing the webhook')
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  // Read the raw body first: the signature covers these exact bytes, so it
  // must be verified before anything parses them.
  const body = await request.text()

  const check = verifyWebhookSignature({
    secret,
    id: request.headers.get('webhook-id'),
    timestamp: request.headers.get('webhook-timestamp'),
    signature: request.headers.get('webhook-signature'),
    body,
  })

  if (!check.ok) {
    console.error('[dodo] signature rejected:', check.reason)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let event: {
    type?: string
    data?: Record<string, unknown> & { metadata?: Record<string, unknown> }
  }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const type = String(event.type ?? '')
  if (!PAID_EVENTS.has(type)) {
    // Acknowledge anything else so Dodo stops retrying it.
    return NextResponse.json({ received: true, ignored: type })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('[dodo] SUPABASE_SERVICE_ROLE_KEY missing; cannot fill a slot for', type)
    // 500 so Dodo retries once the key is in place.
    return NextResponse.json({ error: 'Database not configured.' }, { status: 500 })
  }

  const paymentRef =
    firstString(event.data, ['payment_id', 'subscription_id', 'id']) ?? `dodo:${Date.now()}`

  try {
    // A bid checkout carries its target in metadata, so there is nothing to
    // guess: boost exactly the site that was paid for and leave ad_slots alone.
    if (String(event.data?.metadata?.type ?? '') === 'bid') {
      const metadata = event.data?.metadata ?? {}
      // Normalised here as well as in the database: the bidder's URL, the
      // stored URL and this one all reduce to the same bare domain.
      const domain = normalizeDomain(metadata.site_url)
      const bidAmount = Number(metadata.bid_amount)

      if (!domain || !Number.isFinite(bidAmount) || bidAmount <= 0) {
        console.error('[dodo] bid event with unusable metadata:', JSON.stringify(metadata))
        return NextResponse.json({ received: true, boosted: false, reason: 'bad metadata' })
      }

      // Boosts are permanent: the bid holds its rank until someone outbids
      // it, so nothing sets an expiry.
      const boostedId = await applyBoost(supabase, domain, bidAmount)

      if (!boostedId) {
        // Loud, because this is a payment that bought nothing. The bid amount
        // and domain here are everything needed to apply it by hand.
        console.error(
          `[dodo] PAID BID NOT APPLIED — no listed site for "${domain}" at $${bidAmount} (${paymentRef})`,
        )
        return NextResponse.json({ received: true, boosted: false, reason: 'site not found' })
      }

      await supabase
        .from('bids')
        .update({ status: 'paid' })
        .eq('site_id', boostedId)
        .eq('status', 'pending')

      // The homepage is rendered once and reused for 60 seconds, so without
      // this the site that just paid for #1 would keep its old rank for up to
      // a minute — for the bidder, who is being redirected back right now,
      // that reads as the payment not having worked. Purging here means the
      // next request rebuilds against the new bid.
      revalidatePath('/')

      console.log(`[dodo] ${type} → boosted ${domain} at $${bidAmount}`)
      return NextResponse.json({ received: true, boosted: true, bid: bidAmount })
    }

    const { data: pending, error: requestError } = await supabase
      .from('advertise_requests')
      .select('id,company_name,company_url,one_liner,email')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (requestError) throw new Error(`request lookup: ${requestError.message}`)

    if (!pending) {
      console.warn('[dodo] paid event with no pending request — reconcile by hand:', paymentRef)
      return NextResponse.json({ received: true, filled: false, reason: 'no pending request' })
    }

    const { data: slot, error: slotError } = await supabase
      .from('ad_slots')
      .select('id,position')
      .eq('is_active', false)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (slotError) throw new Error(`slot lookup: ${slotError.message}`)

    if (!slot) {
      console.warn('[dodo] paid event but every slot is taken — refund or queue:', paymentRef)
      return NextResponse.json({ received: true, filled: false, reason: 'no free slot' })
    }

    const { error: fillError } = await supabase
      .from('ad_slots')
      .update({
        company_name: pending.company_name,
        company_url: pending.company_url,
        one_liner: pending.one_liner,
        is_active: true,
        activated_at: new Date().toISOString(),
        cancelled_at: null,
        // Doubles as the proof-of-payment the UI checks before rendering a
        // slot as sold. Named for Stripe, holds any provider's reference.
        stripe_subscription_id: paymentRef,
      })
      .eq('id', slot.id)

    if (fillError) throw new Error(`slot fill: ${fillError.message}`)

    const { error: approveError } = await supabase
      .from('advertise_requests')
      .update({ status: 'paid' })
      .eq('id', pending.id)

    if (approveError) {
      // The slot is live, which is what the buyer paid for; the status is
      // bookkeeping, so log it rather than making Dodo retry a done deal.
      console.error('[dodo] slot filled but request status not updated:', approveError.message)
    }

    revalidatePath('/')

    console.log(`[dodo] ${type} → slot ${slot.position} filled for ${pending.email}`)
    return NextResponse.json({ received: true, filled: true, position: slot.position })
  } catch (error) {
    console.error('[dodo] handler failed:', (error as Error).message)
    // 500 so Dodo retries rather than dropping a paid event.
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }
}

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>

/**
 * Writes the winning bid onto the site, returning its id.
 *
 * The RPC matches on the normalised domain inside Postgres. The second pass
 * exists for a deployment where migration 009 has not been run: without it the
 * function does not exist, and a paid bid must not be dropped because of a
 * missing migration. It narrows on the domain in SQL, then confirms the match
 * in JavaScript so a substring like "outbid.lol" cannot boost
 * "notoutbid.lol".
 */
async function applyBoost(
  supabase: Admin,
  domain: string,
  bidAmount: number,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('apply_boost', {
    site_url: domain,
    new_bid: bidAmount,
  })

  if (!error) return (data as string | null) ?? null
  console.error('[dodo] apply_boost failed, falling back to a direct update:', error.message)

  const { data: rows, error: lookupError } = await supabase
    .from('sites')
    .select('id,url')
    .ilike('url', `%${domain}%`)
    .limit(20)

  if (lookupError) throw new Error(`boost lookup: ${lookupError.message}`)

  const match = (rows ?? []).find((row) => normalizeDomain(row.url) === domain)
  if (!match) return null

  const { error: updateError } = await supabase
    .from('sites')
    .update({ bid_amount: bidAmount })
    .eq('id', match.id)

  if (updateError) throw new Error(`boost: ${updateError.message}`)

  return match.id as string
}

function firstString(data: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!data) return null
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}
