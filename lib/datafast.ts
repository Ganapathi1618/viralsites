import { DATAFAST_WEBSITE_ID } from './types'

export type TrafficStats = {
  /** People on the site right now. */
  live: number | null
  /** Unique visitors over the reporting window. */
  visitors: number | null
  /** Pageviews over the same window. */
  pageviews: number | null
}

export type TrafficResult = TrafficStats & {
  /** Why a figure is missing. Absent when everything resolved. */
  reason?: string
}

const API_BASE = (process.env.DATAFAST_API_URL || 'https://datafa.st/api/v1').replace(/\/$/, '')

/**
 * Key names each figure might arrive under.
 *
 * The two endpoints are confirmed working; their exact field names are not,
 * and datafa.st is unreachable from the environment this was written in.
 * Matching a small set of plausible names is what lets the first real response
 * work instead of needing another round trip to discover a casing difference.
 */
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
const VISITOR_KEYS = ['uniquevisitors', 'unique_visitors', 'totalvisitors', 'total_visitors', 'visitors']
const PAGEVIEW_KEYS = ['totalpageviews', 'total_pageviews', 'pageviews', 'page_views', 'views']

/**
 * The last 30 days, as plain dates.
 *
 * Rolling rather than fixed: a hard-coded range would keep reporting the same
 * month forever, so the header would quietly stop moving a few weeks from now.
 */
export function reportingRange(now = new Date()): { startAt: string; endAt: string } {
  return {
    startAt: new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10),
    endAt: new Date(now).toISOString().slice(0, 10),
  }
}

/** The two endpoints the header reads, fully qualified. */
export function statsUrls(now = new Date()): { realtime: string; overview: string } {
  const { startAt, endAt } = reportingRange(now)

  return {
    realtime: `${API_BASE}/analytics/realtime?websiteId=${DATAFAST_WEBSITE_ID}`,
    overview: `${API_BASE}/analytics/overview?startAt=${startAt}&endAt=${endAt}&websiteId=${DATAFAST_WEBSITE_ID}`,
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
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Reads the header's figures. The two calls run in parallel. */
export async function readTraffic(apiKey: string): Promise<TrafficResult> {
  const urls = statsUrls()

  const [realtime, overview] = await Promise.all([
    getJson(urls.realtime, apiKey),
    getJson(urls.overview, apiKey),
  ])

  const stats: TrafficStats = {
    live: pickNumber(realtime.payload, LIVE_KEYS),
    visitors: pickNumber(overview.payload, VISITOR_KEYS),
    pageviews: pickNumber(overview.payload, PAGEVIEW_KEYS),
  }

  if (stats.live === null && stats.visitors === null && stats.pageviews === null) {
    // Both notes, so one look says whether it is auth, a path, or a shape.
    return { ...stats, reason: `realtime: ${realtime.note} · overview: ${overview.note}` }
  }

  return stats
}

async function getJson(url: string, apiKey: string): Promise<{ payload: unknown; note: string }> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      // The route itself is dynamic; this is where the 30-second cache lives.
      next: { revalidate: 30 },
    })

    const raw = await response.text()
    if (!response.ok) return { payload: null, note: `${response.status} ${raw.slice(0, 120)}` }

    try {
      return { payload: JSON.parse(raw), note: 'ok' }
    } catch {
      return { payload: null, note: '200 but not JSON' }
    }
  } catch (error) {
    return { payload: null, note: (error as Error).message }
  }
}
