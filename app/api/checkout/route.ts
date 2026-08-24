import { NextResponse } from 'next/server'
import { getStripe, siteUrl } from '@/lib/stripe'
import { getSupabase } from '@/lib/supabase/client'

export const runtime = 'nodejs'

/**
 * Creates a Stripe Checkout session for one $50/month ad slot.
 * The slot is not marked filled here — that happens in the webhook, once
 * Stripe confirms the payment.
 */
export async function POST(request: Request) {
  let position: number

  try {
    const body = (await request.json()) as { position?: unknown }
    position = Number(body.position)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!Number.isInteger(position) || position < 1 || position > 6) {
    return NextResponse.json({ error: 'Unknown ad slot.' }, { status: 400 })
  }

  const stripe = getStripe()
  const priceId = process.env.STRIPE_AD_SLOT_PRICE_ID

  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: 'Payments are not configured on this deployment yet.' },
      { status: 503 },
    )
  }

  // Reject a slot someone already bought, so two people cannot pay for one.
  const supabase = getSupabase()
  if (supabase) {
    const { data } = await supabase
      .from('ad_slots')
      .select('is_filled')
      .eq('position', position)
      .maybeSingle()

    if (data?.is_filled) {
      return NextResponse.json({ error: 'That slot was just taken. Pick another.' }, { status: 409 })
    }
  }

  const base = siteUrl()

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/advertise?checkout=success&slot=${position}`,
      cancel_url: `${base}/advertise?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: { ad_slot_position: String(position) },
      subscription_data: { metadata: { ad_slot_position: String(position) } },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[checkout] session create failed:', (error as Error).message)
    return NextResponse.json({ error: 'Could not start checkout. Try again.' }, { status: 502 })
  }
}
