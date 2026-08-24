'use client'

import { useEffect, useState } from 'react'

/**
 * Live visitor count, polled from /api/online.
 *
 * Renders nothing at all until a number arrives, so a deployment without Umami
 * configured shows no empty badge.
 */
export default function OnlineBadge() {
  const [online, setOnline] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const response = await fetch('/api/online')
        const payload = (await response.json()) as { online?: number | null }
        if (!cancelled) setOnline(typeof payload.online === 'number' ? payload.online : null)
      } catch {
        if (!cancelled) setOnline(null)
      }
    }

    poll()
    const timer = setInterval(poll, 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (online === null) return null

  return (
    <div className="hidden items-center gap-2 rounded-full border border-line bg-subtle px-3 py-1 lg:flex">
      <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-brand" />
      <span className="num text-[12px] text-body">
        <span className="font-semibold text-ink">{online}</span> online now
      </span>
    </div>
  )
}
