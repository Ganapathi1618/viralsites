import { getSupabase } from './supabase/client'
import { DEMO_AD_SLOTS, DEMO_SITES, DEMO_SUBMISSIONS } from './demo-data'
import type { AdSlot, Site, Stats, Submission, WeekStats } from './types'

/**
 * Reads for the directory. Every one degrades to the bundled demo data if
 * Supabase is unconfigured or the query fails, so a credential problem shows
 * up as a "demo data" badge rather than a 500.
 */

const WEEK_MS = 7 * 86_400_000

const SITE_COLUMNS =
  'id,name,url,description,model_type,revenue_amount,revenue_verified,revenue_source_url,trend_percent,launched_at,is_featured,created_at'

export type DirectoryData = {
  sites: Site[]
  adSlots: AdSlot[]
  submissions: Submission[]
  stats: Stats
  week: WeekStats
  isLive: boolean
}

export async function getDirectoryData(): Promise<DirectoryData> {
  const supabase = getSupabase()

  if (!supabase) {
    return build(DEMO_SITES, DEMO_AD_SLOTS, DEMO_SUBMISSIONS, false)
  }

  const [sitesResult, slotsResult, submissionsResult] = await Promise.all([
    supabase.from('sites').select(SITE_COLUMNS).order('revenue_amount', { ascending: false }).limit(250),
    supabase.from('ad_slots').select('id,position,company_name,company_url,one_liner,is_active').order('position'),
    supabase.from('submissions').select('id,name,url,model_type,created_at').order('created_at', { ascending: false }).limit(5),
  ])

  if (sitesResult.error) console.error('[data] sites:', sitesResult.error.message)
  if (slotsResult.error) console.error('[data] ad_slots:', slotsResult.error.message)

  const rows = sitesResult.data ?? []
  if (rows.length === 0) {
    // An empty table means the schema has not been seeded yet.
    return build(DEMO_SITES, DEMO_AD_SLOTS, DEMO_SUBMISSIONS, false)
  }

  const sites = rows.map(normalizeSite)
  const adSlots = fillSlots((slotsResult.data ?? []) as Partial<AdSlot>[])

  // Submissions are insert-only for the anon key, so this usually comes back
  // empty in the browser's stead; fall back to the newest sites.
  const submissions: Submission[] =
    submissionsResult.data && submissionsResult.data.length > 0
      ? (submissionsResult.data as Submission[])
      : [...sites]
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          .slice(0, 5)
          .map((site) => ({
            id: site.id,
            name: site.name,
            url: site.url,
            model_type: site.model_type,
            created_at: site.created_at,
          }))

  return build(sites, adSlots, submissions, true)
}

function build(sites: Site[], adSlots: AdSlot[], submissions: Submission[], isLive: boolean): DirectoryData {
  return { sites, adSlots, submissions, stats: computeStats(sites), week: computeWeek(sites), isLive }
}

/** Always render six slots, inventing open placeholders for any gaps. */
function fillSlots(rows: Partial<AdSlot>[]): AdSlot[] {
  return Array.from({ length: 6 }, (_, index) => {
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

export function computeWeek(sites: Site[]): WeekStats {
  const cutoff = Date.now() - WEEK_MS

  const newSites = sites.filter((site) => Date.parse(site.created_at) >= cutoff).length

  const earnedThisWeek = sites.reduce(
    (sum, site) =>
      site.trend_percent && site.trend_percent > 0
        ? sum + site.revenue_amount * (site.trend_percent / 100)
        : sum,
    0,
  )

  // "Went viral": revenue up 25% or more since the last reading. Revenue here
  // is sourced from public X posts, so a site whose number jumped is a site
  // people are posting about. Momentum, not an audited weekly figure.
  const wentViral = sites.filter((site) => (site.trend_percent ?? 0) >= 25).length

  return { newSites, earnedThisWeek, wentViral }
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
