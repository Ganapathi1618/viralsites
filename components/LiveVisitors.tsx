'use client'

import { useEffect, useState } from 'react'

const SESSION_KEY = 'viralsites:session-id'
const HEARTBEAT_MS = 30_000

/** Stable per-tab id, so a reload does not count as a second visitor. */
function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing

    const id = crypto.randomUUID().replace(/-/g, '')
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    // Private mode: a per-load id still counts this visitor, it just will not
    // survive a reload.
    return crypto.randomUUID().replace(/-/g, '')
  }
}

/**
 * "N live" badge, driven by a heartbeat every 30 seconds.
 *
 * Hidden below two: a counter that says "1 live" is telling every visitor they
 * are alone on the page, which is worse than showing nothing.
 */
export default function LiveVisitors({ initial = 0 }: { initial?: number }) {
  const [live, setLive] = useState(initial)

  useEffect(() => {
    const id = sessionId()
    let cancelled = false

    async function beat() {
      try {
        const response = await fetch('/api/visitor', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        const payload = (await response.json()) as { live?: number }
        if (!cancelled && typeof payload.live === 'number') setLive(payload.live)
      } catch {
        // Keep the last known figure rather than flickering to zero.
      }
    }

    beat()
    const timer = setInterval(beat, HEARTBEAT_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (live < 2) return null

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="mx-1 text-muted">·</span>
      <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-money" />
      <span className="font-semibold text-ink">{live}</span> live
    </span>
  )
}
