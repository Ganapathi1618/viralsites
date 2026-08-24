'use client'

import { useState } from 'react'
import { AD_SLOT_PRICE_USD, ONE_LINER_MAX, type AdSlot } from '@/lib/types'

const PERKS = [
  'Shown to every visitor, in the left sidebar of the directory',
  'Your logo letter, name, one-liner and a direct link',
  'A fixed slot — no rotation, no auction, no ad network',
  'Cancel any time from the Stripe receipt',
]

export default function AdvertiseForm({
  slots,
  position,
}: {
  slots: AdSlot[]
  position?: number
}) {
  const open = slots.filter((slot) => !slot.is_active)
  const [selected, setSelected] = useState<number>(position ?? open[0]?.position ?? 4)
  const [oneLiner, setOneLiner] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, position: selected }),
      })
      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Could not start checkout.')
        setLoading(false)
        return
      }

      window.location.href = payload.url
    } catch {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  if (open.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-[14px] font-semibold text-ink">All six slots are taken.</p>
        <p className="mt-1 text-[12.5px] text-muted">
          They free up as subscriptions lapse — check back in a week.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={checkout} className="space-y-4">
      <p className="num text-[12.5px] text-body">
        <span className="font-semibold text-ink">{open.length} slots available</span>
        <span className="mx-1.5 text-muted">·</span>${AD_SLOT_PRICE_USD}/month each
        <span className="mx-1.5 text-muted">·</span>cancel anytime
      </p>

      <ul className="space-y-1.5 rounded-lg border border-line bg-subtle p-3">
        {PERKS.map((perk) => (
          <li key={perk} className="flex gap-2 text-[12px] text-body">
            <span className="mt-[3px] text-money">
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6.5l2.5 2.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>{perk}</span>
          </li>
        ))}
      </ul>

      <div>
        <span className="field-label">Slot</span>
        <div className="flex gap-1.5">
          {open.map((slot) => (
            <button
              key={slot.position}
              type="button"
              onClick={() => setSelected(slot.position)}
              className={`num flex-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition ${
                selected === slot.position
                  ? 'border-brand bg-brand/5 text-brand'
                  : 'border-line text-body hover:border-[#dcdcdc]'
              }`}
            >
              #{slot.position}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="af-url">
          Site URL *
        </label>
        <input id="af-url" name="company_url" type="url" required placeholder="https://yoursite.com" className="field" />
      </div>

      <div>
        <label className="field-label" htmlFor="af-name">
          Display name *
        </label>
        <input id="af-name" name="company_name" required maxLength={40} placeholder="YourSite" className="field" />
      </div>

      <div>
        <label className="field-label" htmlFor="af-oneliner">
          One-liner *
          <span className={`float-right num ${oneLiner.length > ONE_LINER_MAX - 10 ? 'text-down' : 'text-muted'}`}>
            {oneLiner.length}/{ONE_LINER_MAX}
          </span>
        </label>
        <input
          id="af-oneliner"
          name="one_liner"
          required
          maxLength={ONE_LINER_MAX}
          value={oneLiner}
          onChange={(event) => setOneLiner(event.target.value)}
          placeholder="What your site does, in one line."
          className="field"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="af-email">
          Email *
        </label>
        <input id="af-email" name="email" type="email" required placeholder="you@example.com" className="field" />
      </div>

      {error ? <p className="rounded-lg bg-down/[0.08] px-3 py-2 text-[12px] text-down">{error}</p> : null}

      <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
        {loading ? 'Redirecting to Stripe…' : `Subscribe · $${AD_SLOT_PRICE_USD}/month`}
      </button>

      <p className="text-center text-[11px] text-muted">
        Secure checkout by Stripe. Your slot goes live as soon as payment clears.
      </p>
    </form>
  )
}
