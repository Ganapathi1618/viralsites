'use client'

import { useEffect, useState } from 'react'

/**
 * Records this page load and shows the running total.
 *
 * The count arrives already rendered from the server, then the POST reply
 * replaces it with the number that includes this visit — so the figure is
 * never one behind, and there is no flash of an empty badge.
 */
export default function ViewCounter({ initial }: { initial: number }) {
  const [views, setViews] = useState(initial)

  useEffect(() => {
    let cancelled = false

    fetch('/api/pageview', { method: 'POST' })
      .then((response) => response.json())
      .then((payload: { views?: number }) => {
        if (!cancelled && typeof payload.views === 'number' && payload.views > 0) {
          setViews(payload.views)
        }
      })
      .catch(() => {
        // A missed count is not worth showing the visitor anything about.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return <>{views.toLocaleString('en-US')}</>
}
