import { getSupabaseAdmin } from '../supabase/admin'
import {
  discoverLolDomains,
  fetchSource,
  parseListings,
  sourceUrls,
  type ScrapedSite,
} from './parse'

/**
 * Ceiling on bare domains inserted in one run. Discovery is deliberately
 * indiscriminate, so a source that suddenly links out to hundreds of unrelated
 * `.lol` hosts would otherwise flood the directory in a single pass.
 */
const MAX_NEW_DOMAINS_PER_RUN = 100

export type SourceResult = {
  source: string
  listings: number
  domains: number
  error?: string
}

export type SyncResult = {
  ok: boolean
  sources: SourceResult[]
  /** Listings parsed with a revenue figure attached. */
  scraped: number
  /** Bare `.lol` domains found by the discovery pass. */
  discovered: number
  inserted: number
  updated: number
  skipped: number
  error?: string
  /** Present when Supabase is unconfigured: what was found, unsaved. */
  preview?: { listings: ScrapedSite[]; domains: string[] }
}

/**
 * Scrapes every source and writes what it finds to `sites`.
 *
 * Two passes per source. The listing parsers pull name, description and
 * revenue where the markup allows it; the discovery pass collects every `.lol`
 * domain linked from the page. Discovery is deliberately dumber and therefore
 * harder to break — when a source redesigns and the listing parsers go quiet,
 * new boards still get found, just without numbers.
 *
 * Everything written is `revenue_verified: false`. A figure lifted off a page
 * is an estimate, and a discovered domain has no figure at all.
 */
export async function syncFromSources(): Promise<SyncResult> {
  const result: SyncResult = {
    ok: false,
    sources: [],
    scraped: 0,
    discovered: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
  }

  const listings = new Map<string, ScrapedSite>()
  const domains = new Set<string>()

  for (const source of sourceUrls()) {
    try {
      const html = await fetchSource(source)
      const parsed = parseListings(html, source)
      const found = discoverLolDomains(html, source)

      result.sources.push({ source, listings: parsed.length, domains: found.length })

      // First source to claim a URL wins; later ones only add what is new.
      for (const listing of parsed) {
        if (!listings.has(listing.url)) listings.set(listing.url, listing)
      }
      for (const domain of found) domains.add(domain)
    } catch (error) {
      result.sources.push({
        source,
        listings: 0,
        domains: 0,
        error: (error as Error).message,
      })
    }
  }

  const listingRows = [...listings.values()]

  // A domain already covered by a listing needs no bare row of its own.
  const listedHosts = new Set(listingRows.map((row) => hostOf(row.url)))
  const allNewDomains = [...domains].filter((domain) => !listedHosts.has(domain))
  const newDomains = allNewDomains.slice(0, MAX_NEW_DOMAINS_PER_RUN)

  if (allNewDomains.length > newDomains.length) {
    console.warn(
      `[scraper] ${allNewDomains.length} new domains found; capping this run at ${MAX_NEW_DOMAINS_PER_RUN}`,
    )
  }

  result.scraped = listingRows.length
  result.discovered = newDomains.length

  if (listingRows.length === 0 && newDomains.length === 0) {
    result.error = 'nothing found at any source — every fetch failed, or the markup changed'
    return result
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    result.ok = true
    result.skipped = listingRows.length + newDomains.length
    result.preview = { listings: listingRows, domains: newDomains }
    result.error = 'SUPABASE_SERVICE_ROLE_KEY not set — found but not saved'
    return result
  }

  const candidateUrls = [
    ...listingRows.map((row) => row.url),
    ...newDomains.map((domain) => `https://${domain}`),
  ]

  const { data: existingRows, error: readError } = await supabase
    .from('sites')
    .select('id,url,revenue_amount,description')
    .in('url', candidateUrls)

  if (readError) {
    result.error = `read failed: ${readError.message}`
    return result
  }

  // Match on hostname: the same board stored as http/https or with a trailing
  // slash must not be inserted twice.
  const existing = new Map(
    (existingRows ?? []).map((row) => [hostOf(String(row.url)), row]),
  )

  for (const listing of listingRows) {
    const current = existing.get(hostOf(listing.url))

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

  // Discovered domains: insert only, never touch a row that already exists.
  for (const domain of newDomains) {
    if (existing.has(domain)) {
      result.skipped += 1
      continue
    }

    const { error } = await supabase.from('sites').insert({
      name: domain,
      url: `https://${domain}`,
      description: '',
      model_type: 'bid',
      revenue_amount: 0,
      revenue_verified: false,
      is_featured: false,
    })

    if (error) {
      // A unique-violation here just means another run got there first.
      if (!error.message.includes('duplicate')) {
        console.error('[scraper] domain insert failed for', domain, error.message)
      }
      result.skipped += 1
    } else {
      result.inserted += 1
    }
  }

  result.ok = true
  return result
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}
