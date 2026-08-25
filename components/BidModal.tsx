'use client'

import { useState } from 'react'
import Modal from './Modal'
import { formatMoney } from '@/lib/format'
import { BID_INCREMENT_USD, BOOST_HOURS, MIN_BID_USD, type Site } from '@/lib/types'

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
      const payload = (await response.json()) as { url?: string; error?: string; dynamic?: boolean }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'Could not start checkout.')
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
          <p className="label">Current top bid</p>
          <p className="num mt-1 text-[24px] font-bold leading-none text-ink">
            {topBid > 0 ? formatMoney(topBid) : 'No bids yet'}
          </p>
          <p className="mt-1.5 text-[11.5px] text-body">
            Your bid must be higher than {formatMoney(topBid)}.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="bid-amount">
            Your bid (USD)
          </label>
          <input
            id="bid-amount"
            name="amount"
            type="number"
            min={floor}
            step="1"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="field font-mono text-[16px] font-semibold"
          />
          {tooLow ? (
            <p className="mt-1 text-[11px] text-down">Minimum is {formatMoney(floor)}.</p>
          ) : (
            <p className="mt-1 text-[11px] text-muted">
              Puts {site.name} at the top of the table for {BOOST_HOURS} hours.
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
              ? 'Opening Dodo…'
              : `Boost for ${BOOST_HOURS}hrs →`}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-muted">
          Checkout charges exactly your bid. The boost goes live the moment the payment is
          confirmed, and lasts {BOOST_HOURS} hours.
        </p>
      </form>
    </Modal>
  )
}
