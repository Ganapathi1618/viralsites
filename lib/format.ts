export function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

/** Compact form for tight columns: $230,000 -> $230K, $1,240,000 -> $1.24M. */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}

export function formatMonthYear(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatAgo(value: string): string {
  const then = Date.parse(value)
  if (Number.isNaN(then)) return '—'
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
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

/** Deterministic avatar colour so a site keeps the same badge across renders. */
const AVATAR_COLORS = [
  '#0066ff', '#7c3aed', '#ea580c', '#16a34a',
  '#db2777', '#0891b2', '#ca8a04', '#4f46e5',
]

export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

export function formatTrend(percent: number | null): string {
  if (percent === null || percent === undefined) return '—'
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}
