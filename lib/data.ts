import { getSupabase } from './supabase/client'
import { DEMO_AD_SLOTS, DEMO_SITES, DEMO_SUBMISSIONS } from './demo-data'
import type { AdSlot, ModelType, Site, Stats, Submission } from './types'

/**
 * Data access for the directory. Every reader degrades to the bundled demo
 * data when Supabase is unreachable or unconfigured, so the page always
 * renders something rather than throwing at request time.
 */

export type DirectoryData = {
  sites: Site[]
  adSlots: AdSlot[]
  submissions: Submission[]
  stats: Stats
  /** False when the numbers came from demo-data.ts instead of Supabase. */
  isLive: boolean
}

const DAY_MS = 86_400_000

export async function getSites(): Promise<{ sites: Site[]; isLive: boolean }> {
  const supabase = getSupabase()
  if (!supabase) return { sites: DEMO_SITES, isLive: false }

  const { data, error } = await supabase
    .from('sites')
    .select('id,name,url,description,model_type,revenue,prev_revenue,launched_at,is_verified,source_link,created_at')
    .order('revenue', { ascending: false })
    .limit(200)

  if (error || !data || data.length === 0) {
    if (error) console.error('[data] sites query failed:', error.message)
    return { sites: DEMO_SITES, isLive: false }
  }

  return { sites: data.map(normalizeSite), isLive: true }
}

export async function getAdSlots(): Promise<AdSlot[]> {
  const supabase = getSupabase()
  if (!supabase) return DEMO_AD_SLOTS

  const { data, error } = await supabase
    .from('ad_slots')
    .select('id,position,company_name,url,description,is_filled,stripe_subscription_id')
    .order('position', { ascending: true })

  if (error || !data || data.length === 0) {
    if (error) console.error('[data] ad_slots query failed:', error.message)
    return DEMO_AD_SLOTS
  }

  // Always render six slots, filling any gaps with an open placeholder.
  return Array.from({ length: 6 }, (_, index) => {
    const position = index + 1
    return (
      data.find((slot) => slot.position === position) ?? {
        id: `open-${position}`,
        position,
        company_name: null,
        url: null,
        description: null,
        is_filled: false,
        stripe_subscription_id: null,
      }
    )
  }) as AdSlot[]
}

/**
 * Recently submitted sites for the right sidebar. Anonymous visitors cannot
 * read the submissions table (write-only RLS), so this falls back to the most
 * recently created sites, then to demo data.
 */
export async function getRecentSubmissions(sites: Site[]): Promise<Submission[]> {
  const supabase = getSupabase()

  if (supabase) {
    const { data } = await supabase
      .from('submissions')
      .select('id,url,name,description,model_type,revenue,source_link,submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(6)

    if (data && data.length > 0) return data as Submission[]
  }

  if (sites.length > 0 && sites !== DEMO_SITES) {
    return [...sites]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 6)
      .map((site) => ({
        id: site.id,
        url: site.url,
        name: site.name,
        description: site.description,
        model_type: site.model_type,
        revenue: site.revenue,
        source_link: site.source_link,
        submitted_at: site.created_at,
      }))
  }

  return DEMO_SUBMISSIONS
}

export function computeStats(sites: Site[]): Stats {
  const totalRevenue = sites.reduce((sum, site) => sum + site.revenue, 0)

  // "Fastest to $10K": among sites that have crossed $10k, the one with the
  // shortest span between its launch date and today.
  let fastest: Stats['fastestTo10k'] = null
  for (const site of sites) {
    if (site.revenue < 10_000 || !site.launched_at) continue
    const launched = Date.parse(site.launched_at)
    if (Number.isNaN(launched)) continue
    const days = Math.max(1, Math.round((Date.now() - launched) / DAY_MS))
    if (!fastest || days < fastest.days) fastest = { name: site.name, days }
  }

  return { totalRevenue, totalSites: sites.length, fastestTo10k: fastest }
}

export function filterByModel(sites: Site[], model: ModelType | 'all'): Site[] {
  return model === 'all' ? sites : sites.filter((site) => site.model_type === model)
}

export function topEarners(sites: Site[], count = 5): Site[] {
  return [...sites].sort((a, b) => b.revenue - a.revenue).slice(0, count)
}

export async function getDirectoryData(): Promise<DirectoryData> {
  const [{ sites, isLive }, adSlots] = await Promise.all([getSites(), getAdSlots()])
  const submissions = await getRecentSubmissions(sites)

  return { sites, adSlots, submissions, stats: computeStats(sites), isLive }
}

function normalizeSite(row: Record<string, unknown>): Site {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    url: String(row.url ?? ''),
    description: String(row.description ?? ''),
    model_type: row.model_type as Site['model_type'],
    revenue: Number(row.revenue ?? 0),
    prev_revenue: row.prev_revenue === null || row.prev_revenue === undefined ? null : Number(row.prev_revenue),
    launched_at: (row.launched_at as string | null) ?? null,
    is_verified: Boolean(row.is_verified),
    source_link: (row.source_link as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}
