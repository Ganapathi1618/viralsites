import { getSupabase } from './supabase/client'
import { DEMO_AD_SLOTS, DEMO_SITES } from './demo-data'
import type { AdSlot, Site, Stats } from './types'

/**
 * Reads for the directory. Every one degrades to the bundled demo data if
 * Supabase is unconfigured or the query fails, so a credential problem shows
 * up as a "demo data" badge rather than a 500.
 */

/** Positions 1-6 render in the left rail, 7-9 in the right. */
export const AD_SLOT_COUNT = 9
const LEFT_RAIL_SLOTS = 6

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
    supabase.from('ad_slots').select('id,position,company_name,company_url,one_liner,is_active').order('position'),
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
  return {
    sites,
    leftSlots: adSlots.filter((slot) => slot.position <= LEFT_RAIL_SLOTS),
    rightSlots: adSlots.filter((slot) => slot.position > LEFT_RAIL_SLOTS),
    stats: computeStats(sites),
    isLive,
  }
}

/** Always render every slot, inventing open placeholders for any gaps. */
function fillSlots(rows: Partial<AdSlot>[]): AdSlot[] {
  return Array.from({ length: AD_SLOT_COUNT }, (_, index) => {
    const position = index + 1
    const found = rows.find((row) => row.position === position)
    return {
      id: found?.id ?? `open-${position}`,
      position,
      company_name: found?.company_name ?? null,
      company_url: found?.company_url ?? null,
      one_liner: found?.one_liner ?? null,
      is_active: Boolean(found?.is_active),
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
