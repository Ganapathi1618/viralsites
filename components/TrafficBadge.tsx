'use client'

import { useEffect, useState } from 'react'
import { DATAFAST_SHARE_URL } from '@/lib/types'
import type { TrafficStats } from '@/lib/datafast'

function Dot({ color }: { color: string }) {
  return <span className={`h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full ${color}`} />
}

/**
 * Live traffic from Datafast, refreshed every 30 seconds.
 *
 * Each figure appears only once its own number arrives, so a response that
 * carries visitors but not live count shows visitors rather than blanking the
 * row — and a figure that never arrives is left out entirely rather than
 * printed as a zero that reads like a measurement.
 */
export default function TrafficBadge() {
  const [stats, setStats] = useState<TrafficStats | null>(null)

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

  const { live, visitors, pageviews } = stats ?? {}

  return (
    <>
      {live != null && live > 0 ? (
        <span className="num flex shrink-0 items-center gap-1.5 text-[10.5px] sm:text-[11px]">
          <Dot color="bg-money" />
          <span className="font-semibold text-ink">{live}</span>
          <span className="text-muted">online</span>
        </span>
      ) : null}

      {visitors != null ? (
        <span className="num hidden shrink-0 items-center gap-1.5 text-[11px] md:flex">
          <Dot color="bg-brand" />
          <span className="font-semibold text-ink">{visitors.toLocaleString('en-US')}</span>
          <span className="text-muted">visitors</span>
        </span>
      ) : null}

      {pageviews != null ? (
        <span className="num hidden shrink-0 items-center gap-1.5 text-[11px] lg:flex">
          <Dot color="bg-brand" />
          <span className="font-semibold text-ink">{pageviews.toLocaleString('en-US')}</span>
          <span className="text-muted">views</span>
        </span>
      ) : null}

      <a
        href={DATAFAST_SHARE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 whitespace-nowrap text-[10.5px] text-muted transition hover:text-brand sm:text-[11px]"
      >
        Full stats ↗
      </a>
    </>
  )
}
