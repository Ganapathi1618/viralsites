import { NextResponse } from 'next/server'
import { syncFromSource } from '@/lib/scraper/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Scheduled scrape. vercel.json runs this every 6 hours ("0 * / 6 * * *").
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The same header
 * works for manual runs:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/scrape
 */
function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  // With no secret configured, only allow it outside production so a
  // misconfigured deploy cannot leave the endpoint wide open.
  if (!secret) return process.env.NODE_ENV !== 'production'

  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

async function run(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const result = await syncFromSource()
  const startedAt = new Date().toISOString()

  if (!result.ok) {
    console.error('[cron] scrape failed:', result.error)
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
