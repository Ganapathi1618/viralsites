'use client'

import { formatMoney, hostname } from '@/lib/format'
import { BID_INCREMENT_USD, type Site } from '@/lib/types'

/** The paid top three, above the table. */
export default function BoostedStrip({
  sites,
  onOutbid,
}: {
  sites: Site[]
  onOutbid: (site: Site) => void
}) {
  if (sites.length === 0) return null

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label text-[#ea580c]">🔥 Boosted</span>
        <span className="num text-[10.5px] text-muted">top bids right now</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {sites.slice(0, 3).map((site) => (
          <div
            key={site.id}
            className="rounded-lg border border-[#ea580c]/25 bg-[#ea580c]/[0.03] px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={() => {
                  fetch('/api/click', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ url: site.url }),
                    keepalive: true,
                  }).catch(() => {})
                }}
                className="truncate text-[12.5px] font-semibold text-ink hover:text-[#ea580c]"
              >
                {site.name}
              </a>
              <span className="num shrink-0 text-[12px] font-bold text-[#ea580c]">
                {formatMoney(site.bid_amount)}
              </span>
            </div>

            <p className="mt-1 line-clamp-1 text-[11px] text-body">{site.description}</p>

            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="num truncate text-[10px] text-muted">{hostname(site.url)}</span>
              <span className="num shrink-0 text-[10px] text-muted">
                {site.clicks.toLocaleString('en-US')} clicks
              </span>
            </div>

            <button
              type="button"
              onClick={() => onOutbid(site)}
              className="mt-2 w-full rounded border border-[#ea580c]/35 px-2 py-1.5 text-[11px] font-semibold text-[#ea580c] transition hover:bg-[#ea580c] hover:text-white"
            >
              Outbid → {formatMoney(site.bid_amount + BID_INCREMENT_USD)}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
