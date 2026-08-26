import { NextResponse } from 'next/server'
import { PAGE_SIZE, getSitesPage } from '@/lib/data'

export const runtime = 'nodejs'
// Search results must not be served from a cache keyed on the path alone, and
// a boost applied seconds ago has to show up on the next "Load more".
export const dynamic = 'force-dynamic'

/** Offset pagination for the table's "Load more" button, and for search. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const offset = Number(params.get('offset') ?? 0)
  const limit = Number(params.get('limit') ?? PAGE_SIZE)
  const query = (params.get('q') ?? '').slice(0, 100)

  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ error: 'offset must be a non-negative integer.' }, { status: 400 })
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: 'limit must be between 1 and 50.' }, { status: 400 })
  }

  try {
    const { sites, total } = await getSitesPage(offset, limit, query)
    return NextResponse.json({ sites, total, offset, limit, q: query })
  } catch (error) {
    console.error('[api/sites]', (error as Error).message)
    return NextResponse.json({ error: 'Could not load more sites.' }, { status: 502 })
  }
}
