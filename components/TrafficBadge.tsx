'use client'

import { useEffect, useState } from 'react'
import { formatMoney } from '@/lib/format'

type Stats = { made: number | null; watching: number | null; visitors: number | null }

const SHARE_URL = 'https://datafa.st/share/6a8dcd957ec703b02ac6cb54'

function Dot({ color }: { color: string }) {
  return <span className={`h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full ${color}`} />
}

/**
 * Live figures from the Datafast share page, refreshed every 30 seconds.
 *
 * Each badge appears only once its number arrives, so a parse that finds two
 * of three still shows those two rather than blanking the row.
 */
export default function TrafficBadge() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const response = await fetch('/api/stats')
        const payload = (await response.json()) as Stats
        if (!cancelled) setStats(payload)
      } catch {
        // Keep the last known figures rather than flickering away.
      }
    }

    poll()
    const timer = setInterval(poll, 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const { made, watching, visitors } = stats ?? {}
  if (made == null && watching == null && visitors == null) return null

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden sm:gap-3">
      {made != null ? (
        <span className="num flex shrink-0 items-center gap-1.5 text-[11px] sm:text-[12px]">
          <Dot color="bg-money" />
          <span className="font-semibold text-money">{formatMoney(made)}</span>
          <span className="hidden text-muted sm:inline">made</span>
        </span>
      ) : null}

      {watching != null ? (
        <span className="num flex shrink-0 items-center gap-1.5 text-[11px] sm:text-[12px]">
          <Dot color="bg-money" />
          <span className="font-semibold text-ink">{watching}</span>
          <span className="text-muted">watching</span>
        </span>
      ) : null}

      {visitors != null ? (
        <span className="num hidden shrink-0 items-center gap-1.5 text-[12px] md:flex">
          <Dot color="bg-brand" />
          <span className="font-semibold text-ink">{visitors.toLocaleString('en-US')}</span>
          <span className="text-muted">visitors</span>
        </span>
      ) : null}

      <a
        href={SHARE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden shrink-0 text-[11px] text-muted transition hover:text-brand lg:inline"
      >
        Full stats ↗
      </a>
    </div>
  )
}
