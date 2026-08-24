'use client'

import { useState } from 'react'

/**
 * Starts a Stripe Checkout subscription for one ad slot and redirects the
 * buyer to the hosted page. Errors surface inline rather than in the console.
 */
export default function BuySlotButton({
  position,
  className = 'btn-primary w-full',
  label = 'Claim this slot — $50/mo',
}: {
  position: number
  className?: string
  label?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkout() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position }),
      })

      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Could not start checkout. Try again.')
        setLoading(false)
        return
      }

      window.location.href = payload.url
    } catch {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={checkout} disabled={loading} className={className}>
        {loading ? 'Redirecting…' : label}
      </button>
      {error ? <p className="mt-1.5 text-[11px] text-danger">{error}</p> : null}
    </div>
  )
}
