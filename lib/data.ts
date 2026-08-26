import { getSupabase } from './supabase/client'
import { DEMO_AD_SLOTS, DEMO_SITES } from './demo-data'
import type { AdSlot, Site, Stats } from './types'

/**
 * Reads for the directory.
 *
 * Demo data is used for exactly one case: Supabase is not configured at all, so
 * a fresh clone still renders something. Once the credentials are present the
 * real rows are the only source — a failed query surfaces as an error and an
 * empty table surfaces as an empty state. Substituting demo rows there would
 * make a broken connection look like a working one, which is precisely the bug
 * that hid a misconfigured deployment.
 */

/** Six sponsor slots: three in the left rail, three in the right. */
export const AD_SLOT_COUNT = 6
const LEFT_RAIL_SLOTS = 3
const DAY_MS = 86_400_000

/** Rows per page in the table, and per "Load more" click. */
export const PAGE_SIZE = 10

/** Cap on the lightweight pass used for totals and the leaderboard. */
const SUMMARY_LIMIT = 1000

const SITE_COLUMNS =
  'id,name,url,description,model_type,revenue_amount,revenue_verified,revenue_source_url,trend_percent,launched_at,is_featured,created_at,clicks,bid_amount,bid_expires_at,is_boosted,effective_bid'

/**
 * Reads go through the sites_ranked view, which adds is_boosted and
 * effective_bid. Ordering by effective_bid rather than bid_amount matters: an
 * expired bid keeps its number in the column, and sorting on that would let a
 * lapsed boost outrank organic sites earning far more.
 */
const RANKED = 'sites_ranked'



/**
 * The ranking rule, in TypeScript.
 *
 * `sites_ranked` applies this in SQL and is the authority; this exists so the
 * demo fallback obeys the same rule instead of showing whatever order the
 * seed array happens to be in. They must not drift — a fallback that ranks a
 * boosted site third contradicts the one mechanic the site is built on.
 */
export function byRank(a: Site, b: Site): number {
  const boostA = a.bid_amount > 0 ? 1 : 0
  const boostB = b.bid_amount > 0 ? 1 : 0
  if (boostA !== boostB) return boostB - boostA

  const bidA = boostA ? a.bid_amount : 0
  const bidB = boostB ? b.bid_amount : 0
  if (bidA !== bidB) return bidB - bidA

  return b.revenue_amount - a.revenue_amount
}

/** Just enough columns to total revenue and rank the leaderboard. */
const SUMMARY_COLUMNS = 'id,name,url,revenue_amount,created_at'

export type DirectoryData = {
  /** First page only; the rest arrive through /api/sites. */
  sites: Site[]
  /** Total rows in `sites`, so the table knows when to stop paging. */
  total: number
  topEarners: SiteSummary[]
  /**
   * The highest live bid anywhere in `sites`, not just on the rows on screen.
   * Search filters the table, so a price derived from the visible rows would
   * quote a bid the server then rejects for not clearing the board.
   */
  topBid: number
  leftSlots: AdSlot[]
  rightSlots: AdSlot[]
  stats: Stats
  /** False only when Supabase is unconfigured and demo rows are showing. */
  isLive: boolean
  /** Set when Supabase is configured but the query failed. */
  error?: string
}

export type SiteSummary = {
  id: string
  name: string
  url: string
  revenue_amount: number
  created_at: string
}

export async function getDirectoryData(): Promise<DirectoryData> {
  const supabase = getSupabase()

  if (!supabase) {
    console.warn('[data] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing — serving demo data')
    return demoDirectory()
  }

  const [pageResult, summaryResult, slotsResult] = await Promise.all([
    supabase
      .from(RANKED)
      .select(SITE_COLUMNS, { count: 'exact' })
      .order('boost_rank', { ascending: false })
      .order('effective_bid', { ascending: false })
      .order('revenue_amount', { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from(RANKED)
      .select(SUMMARY_COLUMNS)
      .order('revenue_amount', { ascending: false })
      .limit(SUMMARY_LIMIT),
    supabase
      .from('ad_slots')
      .select('id,position,company_name,company_url,one_liner,is_active,stripe_subscription_id')
      .order('position'),
  ])

  const adSlots = rotateActiveSlots(fillSlots((slotsResult.data ?? []) as AdSlotRow[]))

  if (pageResult.error) {
    console.error('[data] sites query failed:', pageResult.error.message)
    return {
      sites: [],
      total: 0,
      topEarners: [],
      topBid: 0,
      ...splitRails(adSlots),
      stats: emptyStats(),
      isLive: true,
      error: pageResult.error.message || 'Could not reach the database.',
    }
  }

  if (summaryResult.error) {
    console.error('[data] summary query failed:', summaryResult.error.message)
  }

  const summary = (summaryResult.data ?? []) as SiteSummary[]

  const sites = (pageResult.data ?? []).map(normalizeSite)

  return {
    sites,
    total: pageResult.count ?? summary.length,
    topEarners: summary.slice(0, 5),
    // The query is ordered by boost, so the highest bid is the first row —
    // there is no second query to make.
    topBid: sites[0]?.is_boosted ? sites[0].bid_amount : 0,
    ...splitRails(adSlots),
    stats: computeStats(summary, pageResult.count ?? summary.length),
    isLive: true,
  }
}

/**
 * One page of the table, used by /api/sites for "Load more" and for search.
 *
 * Search runs in Postgres rather than over the loaded rows: the table pages ten
 * at a time, so filtering in the browser would only ever search the handful
 * already on screen and would report "not found" for a site sitting on page
 * three. Name and URL both match, since people type either.
 */
export async function getSitesPage(offset: number, limit = PAGE_SIZE, query = '') {
  const supabase = getSupabase()
  const term = query.trim()

  if (!supabase) {
    const matched = (term ? DEMO_SITES.filter((site) => matchesTerm(site, term)) : DEMO_SITES)
      .slice()
      .sort(byRank)
    return { sites: matched.slice(offset, offset + limit), total: matched.length }
  }

  let request = supabase
    .from(RANKED)
    .select(SITE_COLUMNS, { count: 'exact' })
    .order('boost_rank', { ascending: false })
    .order('effective_bid', { ascending: false })
    .order('revenue_amount', { ascending: false })
    .range(offset, offset + limit - 1)

  if (term) {
    // Escaped because `%` and `,` are both syntax inside a PostgREST `or`
    // filter: an unescaped one would either match everything or split the
    // expression into two malformed filters.
    const safe = term.replace(/[%,()\\]/g, ' ').trim()
    if (safe) request = request.or(`name.ilike.%${safe}%,url.ilike.%${safe}%`)
  }

  const { data, error, count } = await request

  if (error) throw new Error(error.message || 'Could not load more sites.')

  return { sites: (data ?? []).map(normalizeSite), total: count ?? 0 }
}

/** The demo-mode equivalent of the ilike filter above. */
function matchesTerm(site: Site, term: string): boolean {
  const needle = term.toLowerCase()
  return (
    site.name.toLowerCase().includes(needle) || site.url.toLowerCase().includes(needle)
  )
}

function demoDirectory(): DirectoryData {
  const adSlots = rotateActiveSlots(DEMO_AD_SLOTS)
  const ranked = DEMO_SITES.slice().sort(byRank)
  const summary: SiteSummary[] = DEMO_SITES.map((site) => ({
    id: site.id,
    name: site.name,
    url: site.url,
    revenue_amount: site.revenue_amount,
    created_at: site.created_at,
  }))

  return {
    sites: ranked.slice(0, PAGE_SIZE),
    total: ranked.length,
    topEarners: summary.slice(0, 5),
    topBid: ranked[0]?.is_boosted ? ranked[0].bid_amount : 0,
    ...splitRails(adSlots),
    stats: computeStats(summary, DEMO_SITES.length),
    isLive: false,
  }
}

function splitRails(slots: AdSlot[]) {
  return {
    leftSlots: slots.filter((_, index) => index < LEFT_RAIL_SLOTS),
    rightSlots: slots.filter((_, index) => index >= LEFT_RAIL_SLOTS),
  }
}

function emptyStats(): Stats {
  return { totalEarned: 0, sitesTracked: 0, newest: null, topEarner: null }
}

/** Totals across every row, not just the page on screen. */
export function computeStats(summary: SiteSummary[], total: number): Stats {
  if (summary.length === 0) return { ...emptyStats(), sitesTracked: total }

  const totalEarned = summary.reduce((sum, site) => sum + Number(site.revenue_amount ?? 0), 0)
  const newest = [...summary].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]

  // Computed rather than taken from the query's first row: the directory is
  // ordered by boost now, so trusting the incoming order would crown whoever
  // paid most rather than whoever earns most.
  const top = [...summary].sort(
    (a, b) => Number(b.revenue_amount ?? 0) - Number(a.revenue_amount ?? 0),
  )[0]

  return {
    totalEarned,
    sitesTracked: total,
    newest: newest ? { name: newest.name, created_at: newest.created_at } : null,
    topEarner: top ? { name: top.name, revenue: Number(top.revenue_amount ?? 0) } : null,
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
 * A slot only counts as sold if it carries a payment reference. `is_active`
 * alone is not enough: rows seeded by hand (or left behind by an older seed)
 * would otherwise show as sponsors that nobody is paying for. To place a
 * comped sponsor manually, set stripe_subscription_id to 'manual'.
 *
 * The reference is dropped here and never reaches the browser.
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
    clicks: Number(row.clicks ?? 0),
    bid_amount: Number(row.bid_amount ?? 0),
    bid_expires_at: (row.bid_expires_at as string | null) ?? null,
    is_boosted: Boolean(row.is_boosted),
  }
}
