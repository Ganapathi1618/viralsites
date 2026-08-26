'use client'

import Link from 'next/link'
import TrafficBadge from './TrafficBadge'
import type { Stats } from '@/lib/types'

/**
 * The site count from Supabase, live traffic from Datafast, two actions.
 *
 * The count is rendered on the server because it comes with the page; the
 * traffic figures poll from the client, and each one only appears once its
 * number actually arrives — a missing figure leaves a gap rather than a zero.
 */
export default function Header({ stats, onSubmit }: { stats: Stats; onSubmit: () => void }) {
  return (
    <header className="fixed inset-x-0 top-[var(--banner-h,0px)] z-50 h-14 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-shell items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="shrink-0 text-[14px] font-bold tracking-tight sm:text-[15px]">
            <span className="text-ink">Viral</span>
            <span className="text-brand">Sites</span>
            <span className="hidden font-normal text-muted sm:inline">.fyi</span>
          </Link>

          {stats.sitesTracked > 0 ? (
            <span className="num flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-subtle px-2 py-0.5 text-[10.5px] text-body sm:text-[11px]">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full bg-money" />
              {stats.sitesTracked.toLocaleString('en-US')} sites live
            </span>
          ) : null}

          <TrafficBadge />
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
