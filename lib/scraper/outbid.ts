import type { ModelType } from '../types'

/**
 * Scraper for outbid.lol.
 *
 * outbid.lol ships no public API and its markup is not versioned, so parsing
 * runs through three strategies in order of reliability:
 *
 *   1. Next.js data payloads (`__NEXT_DATA__`, then the streamed `self.__next_f`
 *      chunks) — structured JSON, survives cosmetic markup changes.
 *   2. JSON-LD `ItemList` blocks.
 *   3. A regex sweep over anchors paired with a nearby dollar amount.
 *
 * Anything the parsers cannot read is skipped rather than guessed at, and the
 * caller reports how many rows each run produced so a silent parser breakage
 * shows up as `scraped: 0` instead of looking like a quiet success.
 */

export type ScrapedSite = {
  name: string
  url: string
  description: string
  model_type: ModelType
  revenue: number
  source_link: string
}

const USER_AGENT =
  'ViralSitesBot/1.0 (+https://viralsites.fyi; directory of one-page money sites)'

export function sourceUrl(): string {
  return process.env.SCRAPER_SOURCE_URL || 'https://outbid.lol'
}

export async function fetchSource(url = sourceUrl()): Promise<string> {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`source responded ${response.status} ${response.statusText}`)
  }

  return response.text()
}

export function parseListings(html: string, source = sourceUrl()): ScrapedSite[] {
  const strategies = [parseNextData, parseJsonLd, parseAnchors]

  for (const strategy of strategies) {
    try {
      const listings = strategy(html, source)
      if (listings.length > 0) return dedupe(listings)
    } catch (error) {
      console.warn(`[scraper] ${strategy.name} failed:`, (error as Error).message)
    }
  }

  return []
}

/** Strategy 1 — Next.js payloads embedded in the document. */
function parseNextData(html: string, source: string): ScrapedSite[] {
  const blobs: string[] = []

  const nextData = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
  )
  if (nextData) blobs.push(nextData[1])

  // App-router streaming chunks: self.__next_f.push([1,"...escaped json..."])
  const chunks = html.matchAll(/self\.__next_f\.push\(\[\d+,\s*"([\s\S]*?)"\]\)/g)
  for (const chunk of chunks) {
    try {
      blobs.push(JSON.parse(`"${chunk[1]}"`))
    } catch {
      // Partial chunk; the objects we want are usually whole in another chunk.
    }
  }

  const listings: ScrapedSite[] = []
  for (const blob of blobs) {
    for (const candidate of collectObjects(blob)) {
      const listing = toListing(candidate, source)
      if (listing) listings.push(listing)
    }
  }

  return listings
}

/** Strategy 2 — schema.org ItemList / Product blocks. */
function parseJsonLd(html: string, source: string): ScrapedSite[] {
  const listings: ScrapedSite[] = []
  const blocks = html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const block of blocks) {
    let parsed: unknown
    try {
      parsed = JSON.parse(block[1].trim())
    } catch {
      continue
    }

    for (const node of flatten(parsed)) {
      const listing = toListing(node, source)
      if (listing) listings.push(listing)
    }
  }

  return listings
}

/** Strategy 3 — anchors with a dollar figure nearby. */
function parseAnchors(html: string, source: string): ScrapedSite[] {
  const listings: ScrapedSite[] = []
  const anchors = html.matchAll(
    /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>([\s\S]{0,400}?)(?=<a\s|<\/(?:li|tr|div)>)/gi,
  )

  for (const anchor of anchors) {
    const [, href, label, trailing] = anchor
    const name = stripTags(label)
    if (!name || name.length > 80) continue
    if (isChromeLink(href)) continue

    const revenue = firstAmount(`${label} ${trailing}`)
    if (revenue === null) continue

    listings.push({
      name,
      url: normalizeUrl(href),
      description: stripTags(trailing).slice(0, 200),
      model_type: guessModelType(`${name} ${trailing}`),
      revenue,
      source_link: source,
    })
  }

  return listings
}

/** Shapes a loosely-typed object into a listing, or rejects it. */
function toListing(node: unknown, source: string): ScrapedSite | null {
  if (!node || typeof node !== 'object') return null
  const record = node as Record<string, unknown>

  const name = firstString(record, ['name', 'title', 'site', 'siteName', 'domain'])
  const url = firstString(record, ['url', 'link', 'href', 'website', 'site_url', 'siteUrl'])
  if (!name || !url || !/^https?:\/\//i.test(url)) return null
  if (isChromeLink(url)) return null

  const revenue = firstNumber(record, [
    'revenue',
    'earnings',
    'earned',
    'total',
    'totalRevenue',
    'total_revenue',
    'amount',
    'bid',
    'price',
    'mrr',
  ])
  if (revenue === null) return null

  const description =
    firstString(record, ['description', 'tagline', 'summary', 'subtitle', 'blurb']) ?? ''

  return {
    name: name.slice(0, 80),
    url: normalizeUrl(url),
    description: description.slice(0, 200),
    model_type: guessModelType(`${name} ${description} ${JSON.stringify(record).slice(0, 400)}`),
    revenue,
    source_link: source,
  }
}

export function guessModelType(text: string): ModelType {
  const haystack = text.toLowerCase()
  if (/\bpixel|grid|tile\b/.test(haystack)) return 'pixel'
  if (/\bleaderboard|rank(ing)?|streak|standings\b/.test(haystack)) return 'leaderboard'
  if (/\bsponsor|sponsorship|placement\b/.test(haystack)) return 'sponsor'
  if (/\bbid|auction|outbid|highest\b/.test(haystack)) return 'bid'
  return 'bid'
}

/**
 * "$12,450.50" / "$12.4k" / "$1.2M" -> a number of dollars. The `$` is
 * required: this runs over raw markup, where a bare number is as likely to be
 * a rank or a date as a revenue figure.
 */
export function parseAmount(raw: string): number | null {
  return readAmount(raw, /\$\s*([\d,]+(?:\.\d+)?)\s*([kKmM])?/)
}

/**
 * Same reading, `$` optional. Used only for values pulled from a known
 * revenue field in a JSON payload, where "18.75k" is unambiguous.
 */
export function parseLooseAmount(raw: string): number | null {
  return readAmount(raw, /^\s*\$?\s*([\d,]+(?:\.\d+)?)\s*([kKmM])?/)
}

function readAmount(raw: string, pattern: RegExp): number | null {
  const match = raw.match(pattern)
  if (!match) return null

  const value = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(value)) return null

  const suffix = match[2]?.toLowerCase()
  if (suffix === 'k') return value * 1_000
  if (suffix === 'm') return value * 1_000_000
  return value
}

function firstAmount(text: string): number | null {
  return parseAmount(stripTags(text))
}

function dedupe(listings: ScrapedSite[]): ScrapedSite[] {
  const byUrl = new Map<string, ScrapedSite>()
  for (const listing of listings) {
    const existing = byUrl.get(listing.url)
    // Keep the richest reading for a URL: highest revenue wins ties.
    if (!existing || listing.revenue > existing.revenue) byUrl.set(listing.url, listing)
  }
  return [...byUrl.values()]
}

/** Walks a JSON string and yields every object literal it can parse. */
function* collectObjects(blob: string): Generator<unknown> {
  const starts: number[] = []
  for (let index = 0; index < blob.length; index += 1) {
    if (blob[index] === '{') starts.push(index)
    if (starts.length > 4000) break
  }

  for (const start of starts) {
    const end = matchingBrace(blob, start)
    if (end === -1) continue
    const slice = blob.slice(start, end + 1)
    if (slice.length > 4000) continue
    try {
      yield JSON.parse(slice)
    } catch {
      // Not a standalone object; skip it.
    }
  }
}

function matchingBrace(text: string, start: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

function* flatten(node: unknown): Generator<unknown> {
  if (Array.isArray(node)) {
    for (const item of node) yield* flatten(item)
    return
  }
  if (node && typeof node === 'object') {
    yield node
    for (const value of Object.values(node as Record<string, unknown>)) yield* flatten(value)
  }
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = parseLooseAmount(value)
      if (parsed !== null && parsed > 0) return parsed
    }
  }
  return null
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

/** Social / infrastructure links that appear on every page. */
function isChromeLink(url: string): boolean {
  return /(twitter|x)\.com|github\.com|discord|linkedin|facebook|instagram|youtube|stripe\.com|vercel\.(app|com)\/?$/i.test(
    url,
  )
}
