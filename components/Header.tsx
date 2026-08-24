'use client'

import { formatMoney } from '@/lib/format'
import type { Stats } from '@/lib/types'

export default function Header({
  stats,
  onSubmit,
  onAdvertise,
}: {
  stats: Stats
  onSubmit: () => void
  onAdvertise: () => void
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-shell items-center justify-between gap-4 px-4">
        <a href="/" className="text-[15px] font-bold tracking-tight">
          <span className="text-ink">Viral</span>
          <span className="text-brand">Sites</span>
          <span className="font-normal text-muted">.fyi</span>
        </a>

        <div className="hidden items-center gap-2 rounded-full border border-line bg-subtle px-3 py-1 md:flex">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-money" />
          <span className="num text-[12px] text-body">
            {stats.sitesTracked} sites live
            <span className="mx-1.5 text-muted">·</span>
            <span className="font-semibold text-money">{formatMoney(stats.totalEarned)}</span> earned
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onAdvertise} className="btn-ghost">
            Advertise
          </button>
          <button type="button" onClick={onSubmit} className="btn-primary">
            <span className="hidden sm:inline">Submit a site</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </div>
    </header>
  )
}
