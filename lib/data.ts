import { getSupabase } from './supabase/client'
import { DEMO_AD_SLOTS, DEMO_SITES } from './demo-data'
import type { AdSlot, Site, Stats } from './types'

/**
 * Reads for the directory. Every one degrades to the bundled demo data if
 * Supabase is unconfigured or the query fails, so a credential problem shows
 * up as a "demo data" badge rather than a 500.
 */

/** Six sponsor slots: three in the left rail, three in the right. */
export const AD_SLOT_COUNT = 6
const LEFT_RAIL_SLOTS = 3
const DAY_MS = 86_400_000

const SITE_COLUMNS =
  'id,name,url,description,model_type,revenue_amount,revenue_verified,revenue_source_url,trend_percent,launched_at,is_featured,created_at'

export type DirectoryData = {
  sites: Site[]
  /** Left rail, positions 1-6. */
  leftSlots: AdSlot[]
  /** Right rail, positions 7-9. */
  rightSlots: AdSlot[]
  stats: Stats
  isLive: boolean
}

export async function getDirectoryData(): Promise<DirectoryData> {
  const supabase = getSupabase()

  if (!supabase) {
    return build(DEMO_SITES, DEMO_AD_SLOTS, false)
  }

  const [sitesResult, slotsResult] = await Promise.all([
    supabase.from('sites').select(SITE_COLUMNS).order('revenue_amount', { ascending: false }).limit(250),
    supabase
      .from('ad_slots')
      .select('id,position,company_name,company_url,one_liner,is_active,stripe_subscription_id')
      .order('position'),
  ])

  if (sitesResult.error) console.error('[data] sites:', sitesResult.error.message)
  if (slotsResult.error) console.error('[data] ad_slots:', slotsResult.error.message)

  const rows = sitesResult.data ?? []
  if (rows.length === 0) {
    // An empty table means the schema has not been seeded yet.
    return build(DEMO_SITES, DEMO_AD_SLOTS, false)
  }

  const sites = rows.map(normalizeSite)
  const adSlots = fillSlots((slotsResult.data ?? []) as Partial<AdSlot>[])

  return build(sites, adSlots, true)
}

function build(sites: Site[], adSlots: AdSlot[], isLive: boolean): DirectoryData {
  const rotated = rotateActiveSlots(adSlots)

  return {
    sites,
    leftSlots: rotated.filter((_, index) => index < LEFT_RAIL_SLOTS),
    rightSlots: rotated.filter((_, index) => index >= LEFT_RAIL_SLOTS),
    stats: computeStats(sites),
    isLive,
  }
}

/**
 * Round-robin so no advertiser is stuck in the worst slot.
 *
 * Paid slots cycle through the occupied display positions once every 24 hours;
 * open slots stay where they are, so the layout does not jump around. The shift
 * is derived from the day number rather than stored, which means it needs no
 * cron and no writes, and every request on a given day agrees on the order.
 */
export function rotateActiveSlots(slots: AdSlot[], now = Date.now()): AdSlot[] {
  const active = slots.filter((slot) => slot.is_active)
  if (active.length < 2) return slots

  const shift = Math.floor(now / DAY_MS) % active.length
  const order = [...active.slice(shift), ...active.slice(0, shift)]

  let next = 0
  return slots.map((slot) => (slot.is_active ? order[next++] : slot))
}

export type AdSlotRow = Partial<AdSlot> & { stripe_subscription_id?: string | null }

/**
 * Always render every slot, inventing open placeholders for any gaps.
 *
 * A slot only counts as sold if it carries a Stripe subscription id. `is_active`
 * alone is not enough: rows seeded by hand (or left behind by an older seed)
 * would otherwise show as sponsors that nobody is paying for. To place a
 * comped sponsor manually, set stripe_subscription_id to 'manual'.
 *
 * The subscription id is dropped here and never reaches the browser.
 */
export function fillSlots(rows: AdSlotRow[]): AdSlot[] {
  return Array.from({ length: AD_SLOT_COUNT }, (_, index) => {
    const position = index + 1
    const found = rows.find((row) => row.position === position)
    const sold = Boolean(found?.is_active && found?.stripe_subscription_id)

    return {
      id: found?.id ?? `open-${position}`,
      position,
      company_name: sold ? (found?.company_name ?? null) : null,
      company_url: sold ? (found?.company_url ?? null) : null,
      one_liner: sold ? (found?.one_liner ?? null) : null,
      is_active: sold,
    }
  })
}

export function computeStats(sites: Site[]): Stats {
  const totalEarned = sites.reduce((sum, site) => sum + site.revenue_amount, 0)

  const newest = [...sites].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]

  // "Top earner this week" has no weekly revenue column to read, so it is
  // derived: the largest implied gain, revenue x trend%. Approximate by
  // construction — it ranks momentum, not audited weekly takings.
  let topThisWeek: Stats['topThisWeek'] = null
  for (const site of sites) {
    if (!site.trend_percent || site.trend_percent <= 0) continue
    const gain = site.revenue_amount * (site.trend_percent / 100)
    if (!topThisWeek || gain > topThisWeek.gain) topThisWeek = { name: site.name, gain }
  }

  return {
    totalEarned,
    sitesTracked: sites.length,
    newest: newest ? { name: newest.name, created_at: newest.created_at } : null,
    topThisWeek,
  }
}

export function topEarners(sites: Site[], count = 5): Site[] {
  return [...sites].sort((a, b) => b.revenue_amount - a.revenue_amount).slice(0, count)
}

function normalizeSite(row: Record<string, unknown>): Site {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    url: String(row.url ?? ''),
    description: String(row.description ?? ''),
    model_type: (row.model_type as Site['model_type']) ?? 'other',
    revenue_amount: Number(row.revenue_amount ?? 0),
    revenue_verified: Boolean(row.revenue_verified),
    revenue_source_url: (row.revenue_source_url as string | null) ?? null,
    trend_percent:
      row.trend_percent === null || row.trend_percent === undefined ? null : Number(row.trend_percent),
    launched_at: (row.launched_at as string | null) ?? null,
    is_featured: Boolean(row.is_featured),
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}
