'use client'

import { useEffect, useState } from 'react'

type Stats = { online: number | null; visitors: number | null }

/**
 * "N online · N visitors since launch", from Datafast via /api/stats.
 *
 * Renders nothing until real figures arrive, so a deployment without a
 * Datafast API key shows no empty chrome rather than a badge full of zeroes.
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

  const online = stats?.online
  const visitors = stats?.visitors

  if (typeof online !== 'number' && typeof visitors !== 'number') return null

  return (
    <>
      {typeof online === 'number' ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="mx-1 text-muted">·</span>
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-money" />
          <span className="font-semibold text-money">{online}</span> online
        </span>
      ) : null}

      {typeof visitors === 'number' ? (
        <span className="hidden sm:inline">
          <span className="mx-1.5 text-muted">·</span>
          <span className="font-semibold text-ink">{visitors.toLocaleString('en-US')}</span> visitors
        </span>
      ) : null}
    </>
  )
}
