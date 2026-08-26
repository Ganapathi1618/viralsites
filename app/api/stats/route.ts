import { NextResponse } from 'next/server'
import { parseShare, shareText, type ShareStats } from '@/lib/datafast-share'

export const runtime = 'nodejs'
export const revalidate = 30

const SHARE_URL =
  process.env.DATAFAST_SHARE_URL || 'https://datafa.st/share/6a8dcd957ec703b02ac6cb54'

type Stats = ShareStats & { reason?: string; sample?: string }

/**
 * Live figures scraped from the public Datafast share page.
 *
 * A share page is a rendered dashboard, not an API: it has no contract and its
 * markup can change without warning. So the parse runs twice — first over any
 * embedded JSON (Next.js payloads or a `__DATA__` blob), which survives a
 * restyle, then over labelled numbers in the text as a fallback. Anything not
 * found stays null and its badge simply does not render, rather than showing a
 * zero that looks like a real measurement.
 *
 * This could not be exercised from the build environment — datafa.st is
 * unreachable there — so `reason` carries the failure and the raw sample when
 * nothing parses.
 */
export async function GET() {
  try {
    const response = await fetch(SHARE_URL, {
      headers: {
        'user-agent': 'ViralSitesBot/1.0 (+https://viralsites.fyi)',
        accept: 'text/html',
      },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      return NextResponse.json({
        made: null,
        watching: null,
        visitors: null,
        reason: `share page responded ${response.status}`,
      } satisfies Stats)
    }

    const html = await response.text()
    const stats = parseShare(html)

    if (stats.made === null && stats.watching === null && stats.visitors === null) {
      return NextResponse.json({
        ...stats,
        reason: 'nothing parsed — the share page markup likely changed',
        sample: shareText(html).slice(0, 400),
      })
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({
      made: null,
      watching: null,
      visitors: null,
      reason: `fetch failed: ${(error as Error).message}`,
    } satisfies Stats)
  }
}

