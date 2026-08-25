import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Must stay dynamic: with `revalidate` and no request input, Next prerenders
// the route at build time and freezes whatever the answer was then.
export const dynamic = 'force-dynamic'

type Stats = { online: number | null; visitors: number | null; reason?: string }

/**
 * Site-wide traffic from Datafast, for the header badge.
 *
 * The API key stays on the server: analytics APIs are not CORS-open to
 * browsers and a key in the bundle is a key anyone can use.
 *
 * NOTE: Datafast's API shape could not be verified while this was written —
 * datafa.st is unreachable from the build environment. Both the base URL and
 * the two paths are env-overridable, and the response is read leniently, so
 * correcting this is configuration rather than a code change. Anything
 * unrecognised becomes null, which hides that part of the badge rather than
 * showing a wrong number.
 */
export async function GET() {
  const apiKey = process.env.DATAFAST_API_KEY?.trim()
  const websiteId = process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID?.trim() || 'dfid_vGpUzorjuNOwlhQikL4ui'
  const base = (process.env.DATAFAST_API_URL || 'https://datafa.st/api/v1').replace(/\/$/, '')

  const empty: Stats = { online: null, visitors: null }

  if (!apiKey) {
    return NextResponse.json({ ...empty, reason: 'DATAFAST_API_KEY is not set' })
  }

  const headers = { authorization: `Bearer ${apiKey}`, accept: 'application/json' }

  const [liveResult, totalResult] = await Promise.allSettled([
    request(`${base}/websites/${websiteId}/live`, headers),
    request(`${base}/websites/${websiteId}/stats`, headers),
  ])

  const live = liveResult.status === 'fulfilled' ? liveResult.value : null
  const total = totalResult.status === 'fulfilled' ? totalResult.value : null

  if (live === null && total === null) {
    const why = liveResult.status === 'rejected' ? (liveResult.reason as Error).message : 'unknown'
    return NextResponse.json({ ...empty, reason: `datafast requests failed: ${why}` })
  }

  return NextResponse.json(
    {
      online: readNumber(live, ['online', 'visitors', 'active', 'current', 'live']),
      visitors: readNumber(total, ['visitors', 'unique_visitors', 'uniques', 'total_visitors']),
    },
    // Let the CDN absorb the traffic rather than hammering Datafast.
    { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } },
  )
}

async function request(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`datafast ${response.status} for ${url}`)
  return response.json()
}

/** Accepts 5, {x:5}, [{x:5}], and {data:{x:5}} for any of the given keys. */
function readNumber(payload: unknown, keys: string[]): number | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) return payload

  let node = Array.isArray(payload) ? payload[0] : payload
  if (node && typeof node === 'object' && 'data' in (node as Record<string, unknown>)) {
    const inner = (node as Record<string, unknown>).data
    if (inner && typeof inner === 'object') node = inner
  }
  if (!node || typeof node !== 'object') return null

  for (const key of [...keys, 'value', 'count', 'x']) {
    const value = (node as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }

  return null
}
