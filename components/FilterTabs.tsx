'use client'

import type { Site } from '@/lib/types'

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'bid', label: 'Live Bidding' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'pixel', label: 'Pixel Sales' },
  { id: 'sponsor', label: 'Sponsorship' },
  { id: 'trending', label: '🔥 Trending' },
  { id: 'new', label: '🆕 New this week' },
] as const

export type FilterId = (typeof FILTERS)[number]['id']

const WEEK_MS = 7 * 86_400_000

/** Trending is a trend above 25%; new is added in the last seven days. */
export function applyFilter(sites: Site[], filter: FilterId): Site[] {
  switch (filter) {
    case 'all':
      return sites
    case 'trending':
      return sites.filter((site) => (site.trend_percent ?? 0) >= 25)
    case 'new':
      return sites.filter((site) => Date.now() - Date.parse(site.created_at) <= WEEK_MS)
    default:
      return sites.filter((site) => site.model_type === filter)
  }
}

export default function FilterTabs({
  active,
  onChange,
  sites,
}: {
  active: FilterId
  onChange: (id: FilterId) => void
  sites: Site[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((filter) => {
        const count = applyFilter(sites, filter.id).length
        const isActive = filter.id === active

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(filter.id)}
            aria-pressed={isActive}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
              isActive
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-page text-body hover:border-[#dcdcdc] hover:text-ink'
            }`}
          >
            {filter.label}
            <span className={`num ml-1.5 text-[11px] ${isActive ? 'text-white/70' : 'text-muted'}`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
