'use client'

import { useState } from 'react'
import Modal from './Modal'
import { formatMoney } from '@/lib/format'
import { BID_INCREMENT_USD, MIN_BID_USD, ONE_LINER_MAX } from '@/lib/types'

/**
 * Lists a site and bids for it in one step.
 *
 * The search box turning up nothing is the moment someone is most likely to
 * pay: they came looking for their own site, it is not here, and the thing
 * they want is the top spot. Sending them to a submit form and asking them to
 * come back and bid loses most of them, so this does both in one submit —
 * the route inserts the row, then opens checkout for the bid.
 */
export default function AddAndBidModal({
  open,
  initialQuery,
  topBid,
  onClose,
}: {
  open: boolean
  /** Whatever they typed into search — usually the domain. */
  initialQuery: string
  topBid: number
  onClose: () => void
}) {
  const floor = Math.max(MIN_BID_USD, topBid + BID_INCREMENT_USD)

  const [url, setUrl] = useState(initialQuery)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(String(floor))
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'redirecting'>('idle')
  const [error, setError] = useState<string | null>(null)

  const value = Number(amount)
  const tooLow = !Number.isFinite(value) || value < floor
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const hasUrl = url.trim().includes('.')
  const ready = hasUrl && name.trim() !== '' && !tooLow && emailValid

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready) return

    setStatus('saving')
    setError(null)

    try {
      const response = await fetch('/api/bid/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          site_url: url.trim(),
          bid_amount: value,
          bidder_email: email.trim(),
          // Present only on this path; the route reads them as permission to
          // create the row when the domain is not listed.
          create: {
            name: name.trim(),
            description: description.trim(),
          },
        }),
      })

      const payload = (await response.json()) as { url?: string; error?: string; detail?: string }

      if (!response.ok || !payload.url) {
        setError(
          [payload.error ?? 'Could not start checkout.', payload.detail].filter(Boolean).join(' '),
        )
        setStatus('idle')
        return
      }

      setStatus('redirecting')
      window.location.href = payload.url
    } catch {
      setError('Network error. Try again.')
      setStatus('idle')
    }
  }

  if (!open) return null

  return (
    <Modal
      open
      onClose={onClose}
      title="Add your site and bid"
      subtitle="Listed and boosted in one go"
    >
      <form onSubmit={submit} className="space-y-3.5">
        <div className="rounded-lg border border-line bg-subtle p-3.5">
          <p className="label">{topBid > 0 ? 'Current top bid' : 'No bids yet'}</p>
          <p className="num mt-1 text-[22px] font-bold leading-none text-ink">
            {formatMoney(topBid > 0 ? topBid : MIN_BID_USD)}
          </p>
          <p className="mt-1.5 text-[11.5px] text-body">
            {topBid > 0
              ? `Bid ${formatMoney(floor)} to take #1.`
              : `Be the first for ${formatMoney(MIN_BID_USD)}.`}
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="ab-url">
            Site URL <span className="text-down">*</span>
          </label>
          <input
            id="ab-url"
            type="text"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="yoursite.com"
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ab-name">
            Name <span className="text-down">*</span>
          </label>
          <input
            id="ab-name"
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="YourSite"
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ab-description">
            One-liner
          </label>
          <input
            id="ab-description"
            type="text"
            maxLength={ONE_LINER_MAX}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What it does, in a few words"
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ab-amount">
            Your bid (USD) <span className="text-down">*</span>
          </label>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              aria-label="Lower the bid"
              onClick={() => setAmount(String(Math.max(floor, (Number(amount) || floor) - 1)))}
              className="w-11 shrink-0 rounded-lg border border-line text-[18px] font-semibold text-body transition hover:border-[#dcdcdc] hover:text-ink"
            >
              −
            </button>
            <input
              id="ab-amount"
              type="number"
              min={floor}
              step="1"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="field text-center font-mono text-[18px] font-bold"
            />
            <button
              type="button"
              aria-label="Raise the bid"
              onClick={() => setAmount(String((Number(amount) || floor) + 1))}
              className="w-11 shrink-0 rounded-lg border border-line text-[18px] font-semibold text-body transition hover:border-[#dcdcdc] hover:text-ink"
            >
              +
            </button>
          </div>
          {tooLow ? (
            <p className="mt-1 text-[11px] text-down">Minimum is {formatMoney(floor)}.</p>
          ) : null}
        </div>

        <div>
          <label className="field-label" htmlFor="ab-email">
            Email <span className="text-down">*</span>
          </label>
          <input
            id="ab-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="field"
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-down/[0.08] px-3 py-2 text-[12px] text-down">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={!ready || status !== 'idle'}
          className="btn-primary w-full !py-3 !text-[14px]"
        >
          {status === 'saving'
            ? 'Listing your site…'
            : status === 'redirecting'
              ? 'Opening checkout…'
              : 'Add + Bid →'}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-muted">
          Your site is listed straight away. It moves to the top the moment the payment confirms,
          and holds there until someone bids higher.
        </p>
      </form>
    </Modal>
  )
}
