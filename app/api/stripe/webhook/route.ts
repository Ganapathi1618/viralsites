import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
// The raw body is required for signature verification.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Stripe webhook not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('[stripe] signature verification failed:', (error as Error).message)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('[stripe] SUPABASE_SERVICE_ROLE_KEY missing; cannot record', event.type)
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const position = Number(session.metadata?.ad_slot_position)
        if (!Number.isInteger(position)) break

        await supabase
          .from('ad_slots')
          .update({
            is_filled: true,
            stripe_subscription_id:
              typeof session.subscription === 'string'
                ? session.subscription
                : (session.subscription?.id ?? null),
            stripe_customer_id:
              typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null),
            company_name: session.customer_details?.name ?? 'Reserved',
            description: 'Slot reserved — copy pending.',
            filled_at: new Date().toISOString(),
          })
          .eq('position', position)
        break
      }

      // Subscription ended or lapsed: put the slot back on the market.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await releaseSlot(subscription.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        if (subscriptionId) await releaseSlot(subscriptionId)
        break
      }

      default:
        break
    }
  } catch (error) {
    console.error('[stripe] handler failed for', event.type, (error as Error).message)
    // 500 so Stripe retries rather than dropping the event.
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })

  async function releaseSlot(subscriptionId: string) {
    await supabase!
      .from('ad_slots')
      .update({
        is_filled: false,
        company_name: null,
        url: null,
        description: null,
        stripe_subscription_id: null,
        filled_at: null,
      })
      .eq('stripe_subscription_id', subscriptionId)
  }
}
