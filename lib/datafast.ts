import { DATAFAST_WEBSITE_ID } from './types'

export type TrafficStats = {
  /** Unique visitors over the reporting window. */
  visitors: number | null
  /** Pageviews over the same window. */
  pageviews: number | null
  /** People on the site right now. */
  live: number | null
}

export type TrafficResult = TrafficStats & {
  /** Why a figure is missing. Absent when everything resolved. */
  reason?: string
}

const API_BASE = (process.env.DATAFAST_API_URL || 'https://datafa.st/api/v1').replace(/\/$/, '')

/**
 * Key names each figure might arrive under.
 *
 * Datafast's analytics endpoints are documented but could not be called from
 * the environment this was written in, so the exact field names are not
 * pinned. Matching a set of plausible names is not sloppiness — it is what
 * lets the first real response work rather than needing a second round trip
 * to discover a rename.
 */
const VISITOR_KEYS = [
  'uniquevisitors',
  'unique_visitors',
  'totalvisitors',
  'total_visitors',
  'visitors',
]
const PAGEVIEW_KEYS = [
  'totalpageviews',
  'total_pageviews',
  'pageviews',
  'page_views',
  'views',
]
const LIVE_KEYS = [
  'activevisitors',
  'active_visitors',
  'currentvisitors',
  'current_visitors',
  'realtime',
  'online',
  'live',
  'visitors',
  'count',
]

/** Candidate paths for each figure, tried together; the first that answers wins. */
export const OVERVIEW_PATHS = ['/analytics/overview', '/analytics/pages']
export const REALTIME_PATHS = ['/analytics/realtime', '/analytics/live', '/analytics/visitors/live']

/**
 * The last 30 days, as plain dates.
 *
 * A window has to be chosen for the visitor and pageview totals; 30 days is
 * what a share page shows by default, so the header agrees with the dashboard
 * the "Full stats" link opens.
 */
export function reportingRange(now = new Date()): { startAt: string; endAt: string } {
  const end = new Date(now)
  const start = new Date(now.getTime() - 30 * 86_400_000)
  return { startAt: iso(start), endAt: iso(end) }
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Every URL this module will try, in the order it tries them. */
export function candidateUrls(): { overview: string[]; realtime: string[] } {
  const { startAt, endAt } = reportingRange()
  const range = `startAt=${startAt}&endAt=${endAt}&websiteId=${DATAFAST_WEBSITE_ID}`

  return {
    overview: OVERVIEW_PATHS.map((path) => `${API_BASE}${path}?${range}`),
    realtime: REALTIME_PATHS.map((path) => `${API_BASE}${path}?websiteId=${DATAFAST_WEBSITE_ID}`),
  }
}

/**
 * Finds a number anywhere in a JSON payload, under any of `keys`.
 *
 * Breadth-first on purpose: a total at the top level must win over the same
 * key inside a per-day breakdown further down, which would otherwise report
 * one day's figure as the whole window's.
 */
export function pickNumber(payload: unknown, keys: string[]): number | null {
  const wanted = new Set(keys.map((key) => key.toLowerCase()))
  const queue: unknown[] = [payload]

  while (queue.length > 0) {
    const node = queue.shift()
    if (!node || typeof node !== 'object') continue

    if (Array.isArray(node)) {
      queue.push(...node)
      continue
    }

    const record = node as Record<string, unknown>

    for (const [key, value] of Object.entries(record)) {
      if (!wanted.has(key.toLowerCase())) continue
      const parsed = toNumber(value)
      if (parsed !== null) return parsed
    }

    queue.push(...Object.values(record))
  }

  return null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''))
    if (Number.isFinite(parsed) && value.trim() !== '') return parsed
  }
  return null
}

/** Reads the figures the header shows. Anything unavailable comes back null. */
export async function readTraffic(apiKey: string): Promise<TrafficResult> {
  const urls = candidateUrls()

  const [overview, realtime] = await Promise.all([
    firstAnswer(urls.overview, apiKey),
    firstAnswer(urls.realtime, apiKey),
  ])

  const stats: TrafficStats = {
    visitors: overview.payload ? pickNumber(overview.payload, VISITOR_KEYS) : null,
    pageviews: overview.payload ? pickNumber(overview.payload, PAGEVIEW_KEYS) : null,
    live: realtime.payload ? pickNumber(realtime.payload, LIVE_KEYS) : null,
  }

  if (stats.visitors === null && stats.pageviews === null && stats.live === null) {
    return {
      ...stats,
      // Both failures, so one look says whether it is auth, a path, or a shape.
      reason: `overview: ${overview.note} · realtime: ${realtime.note}`,
    }
  }

  return stats
}

/** Tries candidates in parallel and keeps the first that returns usable JSON. */
async function firstAnswer(
  urls: string[],
  apiKey: string,
): Promise<{ payload: unknown; note: string }> {
  const attempts = await Promise.all(urls.map((url) => attempt(url, apiKey)))

  const won = attempts.find((result) => result.payload !== null)
  if (won) return won

  return { payload: null, note: attempts.map((result) => result.note).join('; ') }
}

async function attempt(url: string, apiKey: string): Promise<{ payload: unknown; note: string }> {
  const path = url.replace(API_BASE, '').split('?')[0]

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 30 },
    })

    const raw = await response.text()

    if (!response.ok) return { payload: null, note: `${path} → ${response.status}` }

    try {
      return { payload: JSON.parse(raw), note: `${path} → ok` }
    } catch {
      return { payload: null, note: `${path} → 200 but not JSON` }
    }
  } catch (error) {
    return { payload: null, note: `${path} → ${(error as Error).message}` }
  }
}
