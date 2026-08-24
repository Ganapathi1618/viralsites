import { getSupabaseAdmin } from '../supabase/admin'
import { fetchSource, parseListings, sourceUrl, type ScrapedSite } from './outbid'

export type SyncResult = {
  ok: boolean
  source: string
  scraped: number
  inserted: number
  updated: number
  skipped: number
  error?: string
  /** Present when Supabase is not configured: the parsed rows, unsaved. */
  preview?: ScrapedSite[]
}

/**
 * Scrapes the source and upserts each listing into `sites`.
 *
 * Updates are deliberately conservative: an existing row keeps its curated
 * name/description, and `prev_revenue` only moves when the revenue figure
 * actually changes, so the trend column compares two distinct readings rather
 * than collapsing to 0% on every run.
 */
export async function syncFromSource(): Promise<SyncResult> {
  const source = sourceUrl()
  const result: SyncResult = { ok: false, source, scraped: 0, inserted: 0, updated: 0, skipped: 0 }

  let listings: ScrapedSite[]
  try {
    const html = await fetchSource(source)
    listings = parseListings(html, source)
  } catch (error) {
    result.error = `fetch failed: ${(error as Error).message}`
    return result
  }

  result.scraped = listings.length

  if (listings.length === 0) {
    result.error = 'no listings parsed — the source markup likely changed'
    return result
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    result.ok = true
    result.skipped = listings.length
    result.preview = listings
    result.error = 'SUPABASE_SERVICE_ROLE_KEY not set — parsed but not saved'
    return result
  }

  const urls = listings.map((listing) => listing.url)
  const { data: existingRows, error: readError } = await supabase
    .from('sites')
    .select('id,url,revenue,description')
    .in('url', urls)

  if (readError) {
    result.error = `read failed: ${readError.message}`
    return result
  }

  const existing = new Map((existingRows ?? []).map((row) => [row.url as string, row]))

  for (const listing of listings) {
    const current = existing.get(listing.url)

    if (!current) {
      const { error } = await supabase.from('sites').insert({
        name: listing.name,
        url: listing.url,
        description: listing.description,
        model_type: listing.model_type,
        revenue: listing.revenue,
        prev_revenue: null,
        is_verified: false,
        source_link: listing.source_link,
      })

      if (error) {
        console.error('[scraper] insert failed for', listing.url, error.message)
        result.skipped += 1
      } else {
        result.inserted += 1
      }
      continue
    }

    const previous = Number(current.revenue ?? 0)
    if (previous === listing.revenue) {
      result.skipped += 1
      continue
    }

    const { error } = await supabase
      .from('sites')
      .update({
        revenue: listing.revenue,
        prev_revenue: previous,
        // Only backfill a description if the row has none.
        description: current.description || listing.description,
        source_link: listing.source_link,
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
