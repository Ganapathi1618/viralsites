import { NextResponse } from 'next/server'
import { readTraffic } from '@/lib/datafast'

export const runtime = 'nodejs'
// The route itself must always run: given a `revalidate` and no dynamic input
// Next prerenders a route handler at build time, which froze an earlier
// version of this endpoint at whatever it answered during the build. The
// 30-second cache lives on the upstream fetch in lib/datafast.ts instead.
export const dynamic = 'force-dynamic'

/**
 * Traffic figures for the header, read from the Datafast API.
 *
 * The key stays on the server — it can read every visitor record for this
 * site, so it must never reach a browser. Cached for 30 seconds, which is how
 * often the header polls.
 *
 * An earlier version scraped Datafast's public share page instead. That page
 * renders in the browser, so a server fetch got markup with no numbers in it
 * and the header simply showed nothing. This calls the documented API.
 */
export async function GET() {
  const apiKey = process.env.DATAFAST_API_KEY?.trim()

  if (!apiKey) {
    return NextResponse.json({
      visitors: null,
      pageviews: null,
      live: null,
      reason: 'DATAFAST_API_KEY is not set on this deployment',
    })
  }

  return NextResponse.json(await readTraffic(apiKey))
}
