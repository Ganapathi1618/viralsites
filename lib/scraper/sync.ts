import { getSupabaseAdmin } from '../supabase/admin'
import { fetchSource, parseListings, sourceUrls, type ScrapedSite } from './parse'

export type SourceResult = {
  source: string
  scraped: number
  error?: string
}

export type SyncResult = {
  ok: boolean
  sources: SourceResult[]
  scraped: number
  inserted: number
  updated: number
  skipped: number
  error?: string
  /** Present when Supabase is unconfigured: what was parsed, unsaved. */
  preview?: ScrapedSite[]
}

/**
 * Scrapes every source and upserts each listing into `sites`.
 *
 * Scraped rows are always `revenue_verified: false` — a number lifted off a
 * page is an estimate until a human attaches a public source. Existing rows
 * keep their curated name and description; only revenue and trend move.
 */
export async function syncFromSources(): Promise<SyncResult> {
  const result: SyncResult = {
    ok: false,
    sources: [],
    scraped: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
  }

  const listings = new Map<string, ScrapedSite>()

  for (const source of sourceUrls()) {
    try {
      const html = await fetchSource(source)
      const parsed = parseListings(html, source)
      result.sources.push({ source, scraped: parsed.length })

      // First source to report a URL wins; later sources only add new ones.
      for (const listing of parsed) {
        if (!listings.has(listing.url)) listings.set(listing.url, listing)
      }
    } catch (error) {
      result.sources.push({ source, scraped: 0, error: (error as Error).message })
    }
  }

  const rows = [...listings.values()]
  result.scraped = rows.length

  if (rows.length === 0) {
    result.error =
      'no listings parsed from any source — markup likely changed, or every fetch failed'
    return result
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    result.ok = true
    result.skipped = rows.length
    result.preview = rows
    result.error = 'SUPABASE_SERVICE_ROLE_KEY not set — parsed but not saved'
    return result
  }

  const { data: existingRows, error: readError } = await supabase
    .from('sites')
    .select('id,url,revenue_amount,description')
    .in('url', rows.map((row) => row.url))

  if (readError) {
    result.error = `read failed: ${readError.message}`
    return result
  }

  const existing = new Map((existingRows ?? []).map((row) => [row.url as string, row]))

  for (const listing of rows) {
    const current = existing.get(listing.url)

    if (!current) {
      const { error } = await supabase.from('sites').insert({
        name: listing.name,
        url: listing.url,
        description: listing.description,
        model_type: listing.model_type,
        revenue_amount: listing.revenue,
        revenue_verified: false,
        revenue_source_url: listing.source_link,
        is_featured: false,
      })

      if (error) {
        console.error('[scraper] insert failed for', listing.url, error.message)
        result.skipped += 1
      } else {
        result.inserted += 1
      }
      continue
    }

    const previous = Number(current.revenue_amount ?? 0)
    if (previous === listing.revenue) {
      result.skipped += 1
      continue
    }

    // Trend is recomputed from the two readings we actually have.
    const trend = previous > 0 ? ((listing.revenue - previous) / previous) * 100 : null

    const { error } = await supabase
      .from('sites')
      .update({
        revenue_amount: listing.revenue,
        trend_percent: trend === null ? null : Number(trend.toFixed(2)),
        description: current.description || listing.description,
      })
      .eq('id', current.id)

    if (error) {
      console.error('[scraper] update failed for', listing.url, error.message)
      result.skipped += 1
    } else {
      result.updated += 1
    }
  }

  result.ok = true
  return result
}
