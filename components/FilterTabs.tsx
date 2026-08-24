import Link from 'next/link'
import { MODEL_TYPES, type ModelType } from '@/lib/types'

const LABELS: Record<ModelType | 'all', string> = {
  all: 'All',
  bid: 'Bid',
  pixel: 'Pixel',
  leaderboard: 'Leaderboard',
  sponsor: 'Sponsor',
}

export default function FilterTabs({
  active,
  counts,
}: {
  active: ModelType | 'all'
  counts: Record<ModelType | 'all', number>
}) {
  const options: (ModelType | 'all')[] = ['all', ...MODEL_TYPES]

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const isActive = option === active
        return (
          <Link
            key={option}
            href={option === 'all' ? '/' : `/?model=${option}`}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-md border px-3 py-1.5 text-[12px] transition ${
              isActive
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-line bg-surface text-muted hover:border-line hover:text-white'
            }`}
          >
            {LABELS[option]}
            <span className="num ml-1.5 text-[11px] opacity-60">{counts[option]}</span>
          </Link>
        )
      })}
    </div>
  )
}
