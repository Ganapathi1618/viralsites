import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Cheap enough to hit often, cached briefly so a busy page cannot hammer Umami.
export const revalidate = 15

/**
 * Live visitor count from Umami's realtime API.
 *
 * The API key stays on the server — Umami's `/active` endpoint is not
 * CORS-open to browsers and the key must not ship to one.
 *
 * Umami has returned this figure in several shapes across versions, so the
 * response is read leniently and anything unrecognised becomes `null`, which
 * hides the badge rather than showing a wrong number.
 */
export async function GET() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  const apiKey = process.env.UMAMI_API_KEY
  const apiUrl = (process.env.UMAMI_API_URL || 'https://api.umami.is/v1').replace(/\/$/, '')

  if (!websiteId || !apiKey) {
    return NextResponse.json({ online: null, reason: 'not-configured' })
  }

  try {
    const response = await fetch(`${apiUrl}/websites/${websiteId}/active`, {
      headers: { 'x-umami-api-key': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ online: null, reason: `umami ${response.status}` })
    }

    return NextResponse.json({ online: readCount(await response.json()) })
  } catch (error) {
    console.error('[online] umami request failed:', (error as Error).message)
    return NextResponse.json({ online: null, reason: 'request-failed' })
  }
}

/** Accepts 5, {x:5}, [{x:5}], {visitors:5} and {active:5}. */
function readCount(payload: unknown): number | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) return payload

  const node = Array.isArray(payload) ? payload[0] : payload
  if (!node || typeof node !== 'object') return null

  for (const key of ['x', 'visitors', 'active', 'value', 'count']) {
    const value = (node as Record<string, unknown>)[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }

  return null
}
