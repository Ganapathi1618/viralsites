import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Configuration check for a deployment.
 *
 * Reports only whether each secret is present, never its value, and counts the
 * rows it can actually read. Use it to tell "Supabase is not configured" apart
 * from "Supabase is configured but the tables are empty" — the two look
 * identical on the page, which both fall back to demo data.
 */
export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
    STRIPE_AD_SLOT_PRICE_ID: Boolean(process.env.STRIPE_AD_SLOT_PRICE_ID),
    STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  }

  const database: Record<string, unknown> = { reachable: false }

  const supabase = getSupabase()
  if (supabase) {
    const [sites, slots] = await Promise.all([
      supabase.from('sites').select('id', { count: 'exact', head: true }),
      supabase.from('ad_slots').select('id', { count: 'exact', head: true }),
    ])

    database.reachable = !sites.error
    database.sites = sites.count ?? 0
    database.adSlots = slots.count ?? 0
    if (sites.error) database.error = sites.error.message || 'request failed (network, DNS, or bad URL)'
  }

  // Only the service role can write the directory, so check it separately.
  const admin = getSupabaseAdmin()
  database.canPublishSubmissions = Boolean(admin)
  if (admin) {
    const { error } = await admin.from('sites').select('id', { count: 'exact', head: true })
    if (error) {
      database.canPublishSubmissions = false
      database.serviceRoleError = error.message || 'request failed (network, DNS, or bad key)'
    }
  }

  const ready = env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && database.reachable

  return NextResponse.json({ ready, env, database }, { status: ready ? 200 : 503 })
}
