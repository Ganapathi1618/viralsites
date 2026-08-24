'use client'

import { useEffect, useState } from 'react'

type Analytics = { online: number | null; visitors: number | null; pageviews: number | null }

/**
 * Visitor and pageview counts from Umami, polled through /api/analytics.
 *
 * Renders nothing until real numbers arrive, so a deployment without a Umami
 * API key shows no empty chrome rather than a badge full of zeroes.
 */
export default function AnalyticsBadge() {
  const [data, setData] = useState<Analytics | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const response = await fetch('/api/analytics')
        const payload = (await response.json()) as Analytics
        if (!cancelled) setData(payload)
      } catch {
        if (!cancelled) setData(null)
      }
    }

    poll()
    const timer = setInterval(poll, 60_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const parts: string[] = []
  if (data?.visitors != null) parts.push(`${data.visitors.toLocaleString('en-US')} visitors`)
  if (data?.pageviews != null) parts.push(`${data.pageviews.toLocaleString('en-US')} pageviews`)
  if (parts.length === 0 && data?.online != null) parts.push(`${data.online} online`)

  if (parts.length === 0) return null

  return (
    <div className="hidden items-center gap-2 rounded-full border border-line bg-subtle px-3 py-1 lg:flex">
      <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-brand" />
      <span className="num text-[12px] text-body">
        {parts.map((part, index) => (
          <span key={part}>
            {index > 0 ? <span className="mx-1.5 text-muted">·</span> : null}
            {part}
          </span>
        ))}
      </span>
    </div>
  )
}
