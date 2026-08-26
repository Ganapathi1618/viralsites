import { formatMoney, hostname } from '@/lib/format'
import type { SiteSummary } from '@/lib/data'

/**
 * Top five by revenue across the whole table — computed from the summary pass,
 * not from the page currently loaded, so paging does not change it.
 */
export default function TopEarnersRow({ sites }: { sites: SiteSummary[] }) {
  if (sites.length === 0) return null

  return (
    <section className="mt-4">
      <h2 className="label mb-2">Top earners</h2>

      {/* One scrolling row on a phone rather than a wrapped grid: five cards
          stacked two-wide push the table itself below the fold. `-mx-3` lets
          the strip bleed to the screen edge so the fifth card is visibly cut
          off, which is what tells you it scrolls. */}
      <div className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {sites.map((site, index) => (
          <a
            key={site.id}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group w-[44vw] shrink-0 snap-start rounded-lg border border-line px-3 py-2.5 transition hover:border-[#dcdcdc] hover:bg-subtle sm:w-auto sm:shrink"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="num text-[10.5px] font-semibold text-muted">{index + 1}</span>
              <span className="truncate text-[12.5px] font-semibold text-ink group-hover:text-brand">
                {site.name}
              </span>
            </div>
            <p className="num mt-1 text-[14px] font-bold text-money">
              {formatMoney(site.revenue_amount)}
            </p>
            <p className="num truncate text-[10px] text-muted">{hostname(site.url)}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
