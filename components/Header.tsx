'use client'

import Link from 'next/link'
import TrafficBadge from './TrafficBadge'
import { formatCompact, formatMoney } from '@/lib/format'
import type { Stats } from '@/lib/types'

export default function Header({ stats, onSubmit }: { stats: Stats; onSubmit: () => void }) {
  return (
    <header className="fixed inset-x-0 top-[var(--banner-h,0px)] z-50 h-14 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-shell items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        <Link href="/" className="shrink-0 text-[14px] font-bold tracking-tight sm:text-[15px]">
          <span className="text-ink">Viral</span>
          <span className="text-brand">Sites</span>
          <span className="font-normal text-muted">.fyi</span>
        </Link>

        {/* Compact on phones: a shortened revenue figure and no wrapping. */}
        <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-subtle px-2.5 py-1 sm:px-3">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full bg-money" />
          <span className="num truncate text-[11px] text-body sm:text-[12px]">
            {stats.sitesTracked} sites
            <span className="hidden sm:inline"> live</span>
            <span className="mx-1 text-muted sm:mx-1.5">·</span>
            <span className="font-semibold text-money">
              <span className="sm:hidden">{formatCompact(stats.totalEarned)}</span>
              <span className="hidden sm:inline">{formatMoney(stats.totalEarned)}</span>
            </span>
            <span className="hidden sm:inline"> earned</span>
            <TrafficBadge />
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/advertise" className="btn-ghost hidden sm:inline-flex">
            Advertise
          </Link>
          <button type="button" onClick={onSubmit} className="btn-primary">
            <span className="hidden sm:inline">Submit a site</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </div>
    </header>
  )
}
