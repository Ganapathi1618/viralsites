'use client'

import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'viralsites:ticker-dismissed'

/**
 * Scrolling announcement bar above the header.
 *
 * The message list is duplicated so the strip can loop without a visible seam:
 * the animation translates by exactly half its width, which puts the second
 * copy where the first started.
 */
function messages(sitesTracked: number): string[] {
  return [
    '🔥 outbid.lol made $175K in 48hrs',
    // Driven by the real count so it cannot contradict the header two inches
    // below it — and dropped entirely at zero, since a failed database read
    // would otherwise scroll "0 viral sites tracked" across the page.
    ...(sitesTracked > 0 ? [`${sitesTracked} viral sites tracked`] : []),
    'New sites added every hour',
    '🚀 Reserve your sponsor slot for $5',
    'Limited launch offer ends August 30',
    'Submit your site free →',
  ]
}

export default function Ticker({
  sitesTracked,
  onDismiss,
}: {
  sitesTracked: number
  onDismiss: () => void
}) {
  // Visible on first paint so the layout does not jump for the common case;
  // a returning visitor who dismissed it loses it on mount instead.
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISSED_KEY) === '1') {
        setVisible(false)
        onDismiss()
      }
    } catch {
      // Private mode or blocked storage: just leave it showing.
    }
  }, [onDismiss])

  function dismiss() {
    setVisible(false)
    onDismiss()
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Not being able to remember the choice is not worth failing over.
    }
  }

  if (!visible) return null

  const items = messages(sitesTracked)

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex h-9 items-center overflow-hidden bg-ink text-white">
      <div className="marquee flex min-w-full shrink-0 items-center">
        {/* Two identical runs: the second covers the gap as the first exits. */}
        {[0, 1].map((run) => (
          <div key={run} className="flex shrink-0 items-center" aria-hidden={run === 1}>
            {items.map((item) => (
              <span key={item} className="flex shrink-0 items-center whitespace-nowrap">
                <span className="px-4 text-[12px]">{item}</span>
                <span className="text-white/25">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center bg-ink text-white/50 transition hover:text-white"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
