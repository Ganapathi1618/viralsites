import { NextResponse } from 'next/server'
import { umamiApiUrl, umamiWebsiteId } from '@/lib/analytics'

export const runtime = 'nodejs'
/**
 * Must stay dynamic. With `revalidate` and no request input, Next prerenders
 * this at build time and bakes in whatever the answer was then — which meant a
 * deployment built before UMAMI_API_KEY was set would keep reporting "not
 * configured" forever, no matter what the environment said afterwards.
 *
 * Freshness is handled by the CDN header below instead.
 */
export const dynamic = 'force-dynamic'

type Analytics = {
  online: number | null
  visitors: number | null
  pageviews: number | null
  reason?: string
}

/**
 * Site analytics from Umami, for the header badge.
 *
 * The API key stays on the server: Umami's endpoints are not CORS-open to
 * browsers, and the key must never ship to one.
 *
 * Umami has returned these figures in several shapes across versions, so every
 * value is read leniently and anything unrecognised becomes `null`, which hides
 * that part of the badge rather than showing a wrong number.
 */
export async function GET() {
  // Same id the tracking tag uses, so the badge cannot silently read a
  // different website than the one being tracked.
  const websiteId = umamiWebsiteId()
  const apiUrl = umamiApiUrl()
  const apiKey = process.env.UMAMI_API_KEY?.trim()

  const empty: Analytics = { online: null, visitors: null, pageviews: null }

  if (!apiKey) {
    return NextResponse.json({
      ...empty,
      reason: 'UMAMI_API_KEY is not set on this deployment',
    })
  }

  const headers = { 'x-umami-api-key': apiKey, accept: 'application/json' }

  // Totals are since launch: a directory's headline number is cumulative, not
  // a rolling window.
  const startAt = Date.parse('2026-01-01T00:00:00Z')
  const endAt = Date.now()

  const [activeResult, statsResult] = await Promise.allSettled([
    request(`${apiUrl}/websites/${websiteId}/active`, headers),
    request(`${apiUrl}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`, headers),
  ])

  const active = activeResult.status === 'fulfilled' ? activeResult.value : null
  const stats = statsResult.status === 'fulfilled' ? statsResult.value : null

  if (active === null && stats === null) {
    const why =
      activeResult.status === 'rejected' ? (activeResult.reason as Error).message : 'unknown'
    return NextResponse.json({ ...empty, reason: `umami requests failed: ${why}` })
  }

  return NextResponse.json(
    {
      online: readNumber(active),
      visitors: readNumber(pick(stats, 'visitors')),
      pageviews: readNumber(pick(stats, 'pageviews')),
    },
    // Let the CDN absorb the traffic so a busy page cannot hammer Umami.
    { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  )
}

async function request(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) throw new Error(`umami ${response.status} for ${url}`)
  return response.json()
}

function pick(payload: unknown, key: string): unknown {
  if (!payload || typeof payload !== 'object') return null
  return (payload as Record<string, unknown>)[key] ?? null
}

/** Accepts 5, {value:5}, {x:5}, [{x:5}], {visitors:5}, {active:5}. */
function readNumber(payload: unknown): number | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) return payload

  const node = Array.isArray(payload) ? payload[0] : payload
  if (!node || typeof node !== 'object') return null

  for (const key of ['value', 'x', 'visitors', 'active', 'count', 'pageviews']) {
    const value = (node as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }

  return null
}
