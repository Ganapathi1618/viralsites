'use client'

import Link from 'next/link'
import TrafficBadge from './TrafficBadge'
import type { Stats } from '@/lib/types'

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

          {/* The directory's own count, straight from Supabase. */}
          <span className="num shrink-0 rounded-full border border-line bg-subtle px-2 py-0.5 text-[10.5px] text-body sm:text-[11px]">
            {stats.sitesTracked} sites
          </span>
        </div>

        <TrafficBadge />

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
