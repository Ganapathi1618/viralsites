'use client'

import Link from 'next/link'
import TrafficBadge, { useTraffic } from './TrafficBadge'
import type { Stats } from '@/lib/types'

/**
 * Logo left, live traffic centred, actions right.
 *
 * The outer two zones are `flex-1`, so the middle one sits at the true centre
 * of the bar rather than wherever `justify-between` happens to leave it.
 *
 * On a phone there is no room for three zones on one line, so the stats drop
 * to a second row. The header's height is a CSS variable rather than a class,
 * because the fixed rails and the content offset all have to shift by exactly
 * the same amount when that second row appears.
 */
export default function Header({ stats, onSubmit }: { stats: Stats; onSubmit: () => void }) {
  // Fetched once here; both copies of the badge render the same numbers.
  const traffic = useTraffic()

  return (
    <header className="fixed inset-x-0 top-[var(--banner-h,0px)] z-50 h-[var(--header-h)] border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-shell flex-col justify-center gap-1.5 px-3 sm:gap-0 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link href="/" className="shrink-0 text-[14px] font-bold tracking-tight sm:text-[15px]">
              <span className="text-ink">Viral</span>
              <span className="text-brand">Sites</span>
              <span className="hidden font-normal text-muted sm:inline">.fyi</span>
            </Link>

            {stats.sitesTracked > 0 ? (
              <span className="num flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-subtle px-2 py-0.5 text-[10.5px] text-body sm:text-[11px]">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full bg-money" />
                {stats.sitesTracked.toLocaleString('en-US')} sites
              </span>
            ) : null}
          </div>

          {/* Desktop only; on a phone this moves to the row below. */}
          <div className="hidden shrink-0 sm:block">
            <TrafficBadge stats={traffic} />
          </div>

          <div className="flex flex-1 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <Link href="/advertise" className="btn-ghost hidden sm:inline-flex">
              Advertise
            </Link>
            <button type="button" onClick={onSubmit} className="btn-primary">
              <span className="hidden sm:inline">Submit a site</span>
              <span className="sm:hidden">Submit</span>
            </button>
          </div>
        </div>

        {/* Second row, phones only. */}
        <div className="sm:hidden">
          <TrafficBadge stats={traffic} />
        </div>
      </div>
    </header>
  )
}
