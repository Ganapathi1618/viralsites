'use client'

import { useState } from 'react'
import {
  AD_SLOT_LIST_PRICE_USD,
  AD_SLOT_PRICE_USD,
  DODO_CHECKOUT_URL,
  ONE_LINER_MAX,
  type AdSlot,
} from '@/lib/types'

type Status = { kind: 'idle' | 'saving' | 'redirecting' } | { kind: 'error'; message: string }

/** Middle column of /advertise: the launch deal, then the details form. */
export default function AdvertiseView({ slots }: { slots: AdSlot[] }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [name, setName] = useState('')
  const [oneLiner, setOneLiner] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  const open = slots.filter((slot) => !slot.is_active).length

  /** Fill the name from the site's own title, if it will tell us. */
  async function lookupTitle(event: React.FocusEvent<HTMLInputElement>) {
    const url = event.target.value.trim()
    if (!url || name.trim()) return

    setLookingUp(true)
    try {
      const response = await fetch(`/api/site-meta?url=${encodeURIComponent(url)}`)
      const payload = (await response.json()) as { title?: string }
      if (payload.title) setName(payload.title)
    } catch {
      // Leave it blank; the field is editable.
    } finally {
      setLookingUp(false)
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())

    setStatus({ kind: 'saving' })

    try {
      const response = await fetch('/api/advertise-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        setStatus({ kind: 'error', message: payload.error ?? 'Could not save your details.' })
        return
      }

      // The details are recorded, so hand the buyer to Dodo in this tab.
      setStatus({ kind: 'redirecting' })
      window.location.href = DODO_CHECKOUT_URL
    } catch {
      setStatus({ kind: 'error', message: 'Network error. Try again.' })
    }
  }

  const busy = status.kind === 'saving' || status.kind === 'redirecting'

  return (
    <div className="max-w-[520px]">
      <h1 className="text-[22px] font-bold tracking-tight text-ink">Grab a spot</h1>
      <p className="mt-1 text-[13px] text-muted">
        Fill in your details. Dodo Payments starts a monthly subscription from there.
      </p>

      <div className="mt-5 rounded-lg border border-brand/25 bg-brand/[0.03] p-4">
        <span className="inline-flex items-center rounded bg-brand px-1.5 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
          Launch deal
        </span>

        <p className="mt-2.5 flex flex-wrap items-baseline gap-2">
          <span className="num text-[22px] font-bold text-ink">
            ${AD_SLOT_PRICE_USD} for a month
          </span>
          <span className="num text-[13px] text-muted line-through">
            ${AD_SLOT_LIST_PRICE_USD} for a month
          </span>
        </p>

        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
          Limited-time price. After promo ends, next spot jumps to ${AD_SLOT_LIST_PRICE_USD}/month.
        </p>

        {open > 0 ? (
          <p className="num mt-2 text-[11.5px] text-body">
            {open} of {slots.length} spots open right now.
          </p>
        ) : (
          <p className="mt-2 text-[11.5px] text-body">
            Every spot is taken. Leave your details and we&apos;ll email you when one frees up.
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
        <div>
          <label className="field-label" htmlFor="ad-url">
            Site URL *
          </label>
          <input
            id="ad-url"
            name="company_url"
            type="url"
            required
            onBlur={lookupTitle}
            placeholder="https://yoursite.com"
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ad-name">
            Name * {lookingUp ? <span className="text-muted">· fetching…</span> : null}
          </label>
          <input
            id="ad-name"
            name="company_name"
            required
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="YourSite"
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ad-oneliner">
            One-liner *
            <span
              className={`float-right num ${
                oneLiner.length > ONE_LINER_MAX - 10 ? 'text-down' : 'text-muted'
              }`}
            >
              {oneLiner.length}/{ONE_LINER_MAX}
            </span>
          </label>
          <textarea
            id="ad-oneliner"
            name="one_liner"
            required
            rows={2}
            maxLength={ONE_LINER_MAX}
            value={oneLiner}
            onChange={(event) => setOneLiner(event.target.value)}
            placeholder="What your site does, in one line."
            className="field resize-y"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ad-email">
            Email *
          </label>
          <input
            id="ad-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="field"
          />
          <p className="mt-1 text-[11px] text-muted">
            Dodo sends the receipt here and bills each month.
          </p>
        </div>

        {status.kind === 'error' ? (
          <p className="rounded-lg bg-down/[0.08] px-3 py-2 text-[12px] text-down">
            {status.message}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className="btn-primary w-full !py-2.5">
          {status.kind === 'saving'
            ? 'Saving…'
            : status.kind === 'redirecting'
              ? 'Opening Dodo…'
              : `Subscribe · $${AD_SLOT_PRICE_USD} for a month`}
        </button>

        <p className="text-center text-[11px] text-muted">
          Your details are saved here first, then checkout opens with Dodo Payments. Your spot goes
          live once the payment clears.
        </p>
      </form>
    </div>
  )
}
