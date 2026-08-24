import { formatMoney, hostname } from '@/lib/format'
import type { Site } from '@/lib/types'

/** Top five by revenue, as a horizontal strip above the table. */
export default function TopEarnersRow({ sites }: { sites: Site[] }) {
  if (sites.length === 0) return null

  return (
    <section className="mt-4">
      <h2 className="label mb-2">Top earners</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {sites.map((site, index) => (
          <a
            key={site.id}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group rounded-lg border border-line px-3 py-2.5 transition hover:border-[#dcdcdc] hover:bg-subtle"
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
