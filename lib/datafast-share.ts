/**
 * Parsing for the public Datafast share page.
 *
 * A share page is a rendered dashboard, not an API: it has no contract and its
 * markup can change without warning. So the parse runs twice — first over any
 * embedded JSON, which survives a restyle, then over labelled numbers in the
 * text. Anything not found stays null and its badge simply does not render,
 * rather than showing a zero that looks like a measurement.
 */
export type ShareStats = {
  made: number | null
  watching: number | null
  visitors: number | null
}

export function parseShare(html: string): ShareStats {
  const fromJson = fromEmbeddedJson(html)
  const plain = shareText(html)

  return {
    made: fromJson.made ?? money(plain, ['made', 'revenue', 'earned']),
    watching: fromJson.watching ?? count(plain, ['watching', 'online', 'active', 'right now']),
    visitors: fromJson.visitors ?? count(plain, ['visitors', 'unique visitors', 'since launch']),
  }
}

/** Structured data first: it survives a restyle that would break text matching. */
function fromEmbeddedJson(html: string): Partial<ShareStats> {
  const out: Partial<ShareStats> = {}
  const blobs = [
    ...html.matchAll(/<script[^>]*>\s*(?:self\.__NEXT_DATA__|window\.__DATA__)\s*=\s*({[\s\S]*?})\s*<\/script>/g),
    ...html.matchAll(/<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g),
  ]

  for (const blob of blobs) {
    let parsed: unknown
    try {
      parsed = JSON.parse(blob[1])
    } catch {
      continue
    }

    for (const node of walk(parsed)) {
      if (!node || typeof node !== 'object') continue
      const record = node as Record<string, unknown>

      out.made ??= numberAt(record, ['revenue', 'made', 'total_revenue', 'earnings'])
      out.watching ??= numberAt(record, ['visitors_online', 'online', 'watching', 'active_visitors'])
      out.visitors ??= numberAt(record, ['visitors', 'unique_visitors', 'total_visitors'])
    }
  }

  return out
}

function* walk(node: unknown): Generator<unknown> {
  if (Array.isArray(node)) {
    for (const item of node) yield* walk(item)
    return
  }
  if (node && typeof node === 'object') {
    yield node
    for (const value of Object.values(node as Record<string, unknown>)) yield* walk(value)
  }
}

function numberAt(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.]/g, ''))
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }
  return undefined
}

export function shareText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "$292,937 made" or "made $292,937" — either order, either side. */
function money(plain: string, labels: string[]): number | null {
  for (const label of labels) {
    const near = new RegExp(`\\$\\s*([\\d,.]+)\\s*(?:\\w+\\s+){0,2}${label}|${label}[^$]{0,20}\\$\\s*([\\d,.]+)`, 'i')
    const match = plain.match(near)
    const raw = match?.[1] ?? match?.[2]
    if (raw) {
      const value = Number(raw.replace(/,/g, ''))
      if (Number.isFinite(value)) return value
    }
  }
  return null
}

function count(plain: string, labels: string[]): number | null {
  for (const label of labels) {
    const near = new RegExp(`([\\d,]+)\\s*(?:\\w+\\s+){0,2}${label}|${label}[^\\d]{0,20}([\\d,]+)`, 'i')
    const match = plain.match(near)
    const raw = match?.[1] ?? match?.[2]
    if (raw) {
      const value = Number(raw.replace(/,/g, ''))
      if (Number.isFinite(value)) return value
    }
  }
  return null
}
