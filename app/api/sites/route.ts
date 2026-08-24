import { NextResponse } from 'next/server'
import { PAGE_SIZE, getSitesPage } from '@/lib/data'

export const runtime = 'nodejs'
export const revalidate = 60

/** Offset pagination for the table's "Load more" button. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const offset = Number(params.get('offset') ?? 0)
  const limit = Number(params.get('limit') ?? PAGE_SIZE)

  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ error: 'offset must be a non-negative integer.' }, { status: 400 })
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: 'limit must be between 1 and 50.' }, { status: 400 })
  }

  try {
    const { sites, total } = await getSitesPage(offset, limit)
    return NextResponse.json({ sites, total, offset, limit })
  } catch (error) {
    console.error('[api/sites]', (error as Error).message)
    return NextResponse.json({ error: 'Could not load more sites.' }, { status: 502 })
  }
}
