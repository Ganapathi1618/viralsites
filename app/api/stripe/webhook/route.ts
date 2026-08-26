import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
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

  // The raw body is required for signature verification.
  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('[stripe] bad signature:', (error as Error).message)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('[stripe] service role key missing; cannot record', event.type)
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
            is_active: true,
            company_name: session.metadata?.company_name ?? null,
            company_url: session.metadata?.company_url ?? null,
            one_liner: session.metadata?.one_liner ?? null,
            stripe_subscription_id: idOf(session.subscription),
            stripe_customer_id: idOf(session.customer),
            activated_at: new Date().toISOString(),
            cancelled_at: null,
          })
          .eq('position', position)
        break
      }

      // Subscription ended: put the slot back on the market but keep the
      // Stripe ids for the record.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await release(subscription.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const id = idOf(invoice.subscription)
        if (id) await release(id)
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

  async function release(subscriptionId: string) {
    await supabase!
      .from('ad_slots')
      .update({
        is_active: false,
        company_name: null,
        company_url: null,
        one_liner: null,
        cancelled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId)
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}
