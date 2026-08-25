import { formatMoney, hostname } from '@/lib/format'
import type { Site } from '@/lib/types'

/** The paid top three, above the table. */
export default function BoostedStrip({ sites }: { sites: Site[] }) {
  if (sites.length === 0) return null

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label text-[#ea580c]">🔥 Boosted</span>
        <span className="num text-[10.5px] text-muted">top bids right now</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {sites.slice(0, 3).map((site) => (
          <a
            key={site.id}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group rounded-lg border border-[#ea580c]/25 bg-[#ea580c]/[0.03] px-3 py-2.5 transition hover:border-[#ea580c]/50"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[12.5px] font-semibold text-ink group-hover:text-[#ea580c]">
                {site.name}
              </span>
              <span className="num shrink-0 text-[12px] font-bold text-[#ea580c]">
                {formatMoney(site.bid_amount)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="num truncate text-[10px] text-muted">{hostname(site.url)}</span>
              <span className="num shrink-0 text-[10px] text-muted">
                {site.clicks.toLocaleString('en-US')} clicks
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
