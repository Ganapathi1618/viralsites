'use client'

import { useState } from 'react'
import Modal from './Modal'
import { formatMoney } from '@/lib/format'
import { BID_INCREMENT_USD, MIN_BID_USD, type Site } from '@/lib/types'

/** Bid to put a site at the top of the table for a day. */
export default function BidModal({
  site,
  topBid,
  onClose,
}: {
  site: Site | null
  topBid: number
  onClose: () => void
}) {
  // Beat the board's top bid by a dollar, or start at the floor if nobody has
  // bid yet.
  const floor = Math.max(MIN_BID_USD, topBid + BID_INCREMENT_USD)
  const [amount, setAmount] = useState(String(floor))
  const [status, setStatus] = useState<'idle' | 'saving' | 'redirecting'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!site) return null

  const value = Number(amount)
  const tooLow = !Number.isFinite(value) || value < floor

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!site || tooLow) return

    const email = new FormData(event.currentTarget).get('email')

    setStatus('saving')
    setError(null)

    try {
      const response = await fetch('/api/bid/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          site_url: site.url,
          bid_amount: value,
          bidder_email: email,
        }),
      })
      const payload = (await response.json()) as {
        url?: string
        error?: string
        detail?: string
      }

      if (!response.ok || !payload.url) {
        // The detail names the provider's own error, which is the difference
        // between "try again" and knowing what to fix.
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

  return (
    <Modal open onClose={onClose} title="Bid to boost" subtitle={site.name}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-line bg-subtle p-3.5">
          {topBid > 0 ? (
            <>
              <p className="label">Current bid</p>
              <p className="num mt-1 text-[24px] font-bold leading-none text-ink">
                {formatMoney(topBid)}
              </p>
              <p className="mt-1.5 text-[11.5px] text-body">
                Bid {formatMoney(floor)} to claim this spot.
              </p>
            </>
          ) : (
            <>
              <p className="label">No bids yet</p>
              <p className="num mt-1 text-[24px] font-bold leading-none text-ink">
                {formatMoney(MIN_BID_USD)}
              </p>
              <p className="mt-1.5 text-[11.5px] text-body">
                Be the first for {formatMoney(MIN_BID_USD)}.
              </p>
            </>
          )}

          <p className="num mt-2 border-t border-line pt-2 text-[11px] text-muted">
            {site.name} · {site.clicks.toLocaleString('en-US')} clicks
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="bid-amount">
            Your bid (USD)
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
              id="bid-amount"
              name="amount"
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
          ) : (
            <p className="mt-1 text-[11px] text-muted">
              Puts {site.name} at the top of the table until someone outbids it.
            </p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="bid-email">
            Email
          </label>
          <input
            id="bid-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="field"
          />
          <p className="mt-1 text-[11px] text-muted">
            For the receipt, and so we can reach you about the boost.
          </p>
        </div>

        {error ? (
          <p className="rounded-lg bg-down/[0.08] px-3 py-2 text-[12px] text-down">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={tooLow || status !== 'idle'}
          className="btn-primary w-full !py-3 !text-[14px]"
        >
          {status === 'saving'
            ? 'Recording your bid…'
            : status === 'redirecting'
              ? 'Opening checkout…'
              : 'Bid now →'}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-muted">
          Checkout charges exactly your bid. Your spot goes live the moment the payment is
          confirmed, and holds until someone bids higher.
        </p>
      </form>
    </Modal>
  )
}
