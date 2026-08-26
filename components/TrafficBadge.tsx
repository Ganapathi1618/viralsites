'use client'

import { useEffect, useState } from 'react'
import { DATAFAST_SHARE_URL } from '@/lib/types'
import type { TrafficStats } from '@/lib/datafast'

/**
 * Polls Datafast's figures every 30 seconds.
 *
 * A hook rather than state inside the badge, because the header renders the
 * badge twice — once centred for desktop, once on its own row for phones —
 * and two mounted copies would mean two polls for one set of numbers.
 */
export function useTraffic(): TrafficStats {
  const [stats, setStats] = useState<TrafficStats>({
    live: null,
    visitors: null,
    pageviews: null,
  })

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const response = await fetch('/api/stats')
        const payload = (await response.json()) as TrafficStats
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

  return stats
}

function Stat({
  value,
  label,
  dot,
  className = '',
}: {
  value: number
  label: string
  dot: string
  className?: string
}) {
  return (
    <span className={`num flex shrink-0 items-center gap-1.5 ${className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="font-semibold text-ink">{value.toLocaleString('en-US')}</span>
      <span className="text-muted">{label}</span>
    </span>
  )
}

/**
 * Live traffic from Datafast.
 *
 * Each figure appears only once its own number arrives, so a response that
 * carries visitors but not a live count shows visitors rather than blanking
 * the row — and a figure that never arrives is left out entirely rather than
 * printed as a zero that reads like a measurement.
 *
 * Pageviews is the one that drops on narrow screens: three numbers plus a link
 * do not fit on a phone, and it is the least urgent of them.
 */
export default function TrafficBadge({ stats }: { stats: TrafficStats }) {
  const { live, visitors, pageviews } = stats

  return (
    <div className="flex items-center gap-2 whitespace-nowrap text-[10.5px] sm:gap-3 sm:text-[11.5px]">
      {live != null ? <Stat value={live} label="live" dot="animate-pulse-dot bg-money" /> : null}
      {visitors != null ? <Stat value={visitors} label="visitors" dot="bg-brand" /> : null}
      {pageviews != null ? (
        <Stat value={pageviews} label="pageviews" dot="bg-muted" className="hidden sm:flex" />
      ) : null}

      <a
        href={DATAFAST_SHARE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-muted transition hover:text-brand"
      >
        Full stats ↗
      </a>
    </div>
  )
}
