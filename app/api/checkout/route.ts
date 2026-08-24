import { NextResponse } from 'next/server'
import { getStripe, siteUrl } from '@/lib/stripe'
import { getSupabase } from '@/lib/supabase/client'
import { ONE_LINER_MAX } from '@/lib/types'

export const runtime = 'nodejs'

/**
 * Starts a $50/month subscription for one ad slot.
 *
 * The slot is NOT marked active here — only the webhook does that, once Stripe
 * confirms payment. The buyer's copy rides along in metadata so the webhook can
 * fill the slot without a second round trip.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const position = Number(body.position)
  if (!Number.isInteger(position) || position < 1 || position > 6) {
    return NextResponse.json({ error: 'Unknown ad slot.' }, { status: 400 })
  }

  const companyName = String(body.company_name ?? '').trim().slice(0, 40)
  const oneLiner = String(body.one_liner ?? '').trim().slice(0, ONE_LINER_MAX)
  const email = String(body.email ?? '').trim()

  let companyUrl: string
  try {
    const parsed = new URL(String(body.company_url ?? ''))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
    companyUrl = parsed.toString()
  } catch {
    return NextResponse.json({ error: 'Enter a valid site URL.' }, { status: 400 })
  }

  if (!companyName) return NextResponse.json({ error: 'Enter a display name.' }, { status: 400 })
  if (!oneLiner) return NextResponse.json({ error: 'Enter a one-liner.' }, { status: 400 })

  const stripe = getStripe()
  const priceId = process.env.STRIPE_AD_SLOT_PRICE_ID
  if (!stripe || !priceId) {
    return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })
  }

  // Don't sell a slot twice.
  const supabase = getSupabase()
  if (supabase) {
    const { data } = await supabase
      .from('ad_slots')
      .select('is_active')
      .eq('position', position)
      .maybeSingle()

    if (data?.is_active) {
      return NextResponse.json({ error: 'That slot was just taken. Pick another.' }, { status: 409 })
    }
  }

  const metadata = {
    ad_slot_position: String(position),
    company_name: companyName,
    company_url: companyUrl,
    one_liner: oneLiner,
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${siteUrl()}/?checkout=success`,
      cancel_url: `${siteUrl()}/?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe returned no checkout URL.' }, { status: 502 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[checkout] failed:', (error as Error).message)
    return NextResponse.json({ error: 'Could not start checkout. Try again.' }, { status: 502 })
  }
}
