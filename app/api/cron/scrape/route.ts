import { NextResponse } from 'next/server'
import { syncFromSources } from '@/lib/scraper/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Scheduled scrape of outbid.lol and outbid.fyi.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically. The
 * same header works for a manual run:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/scrape
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  // With no secret set, refuse in production rather than leaving it open.
  if (!secret) return process.env.NODE_ENV !== 'production'
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  const result = await syncFromSources()

  if (!result.ok) {
    console.error('[cron] scrape failed:', result.error, result.sources)
    return NextResponse.json({ ...result, startedAt }, { status: 502 })
  }

  console.log(
    `[cron] scrape ok — ${result.scraped} parsed, ${result.inserted} new, ${result.updated} updated`,
  )
  return NextResponse.json({ ...result, startedAt })
}

export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}
