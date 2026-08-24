/** Formatting helpers. Every number in the UI goes through one of these. */

export function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

/** $184,320 -> $184.3K, $1,240,000 -> $1.24M. Used where space is tight. */
export function formatCompactMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}K`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${Math.round(value)}`
}

export function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatRelative(value: string): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

/**
 * Percentage change between the last two revenue readings. `null` when there is
 * no prior reading to compare against, so the UI can show "new" instead of 0%.
 */
export function trendPercent(revenue: number, prev: number | null): number | null {
  if (prev === null || prev === undefined || prev <= 0) return null
  return ((revenue - prev) / prev) * 100
}

export function formatTrend(percent: number | null): string {
  if (percent === null) return 'new'
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}
