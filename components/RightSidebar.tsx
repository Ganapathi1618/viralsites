'use client'

import SponsorSlots from './SponsorSlots'
import { formatCompact, hostname } from '@/lib/format'
import type { AdSlot, Site } from '@/lib/types'

function TopEarners({ sites }: { sites: Site[] }) {
  return (
    <section>
      <h2 className="label mb-2">Top earners</h2>
      <ol className="space-y-px">
        {sites.map((site, index) => (
          <li key={site.id}>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition hover:bg-subtle"
            >
              <span className="num w-3 shrink-0 text-[11px] font-semibold text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink group-hover:text-brand">
                  {site.name}
                </span>
                <span className="num block truncate text-[10px] text-muted">{hostname(site.url)}</span>
              </span>
              <span className="num shrink-0 text-[11.5px] font-semibold text-money">
                {formatCompact(site.revenue_amount)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Right rail: top earners, then sponsor positions 7-9. */
export default function RightSidebar({
  topEarners,
  slots,
  onAdvertise,
  onSubmit,
}: {
  topEarners: Site[]
  slots: AdSlot[]
  onAdvertise: (position: number) => void
  onSubmit: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-5">
      <TopEarners sites={topEarners} />
      <SponsorSlots slots={slots} onAdvertise={onAdvertise} />

      <button type="button" onClick={onSubmit} className="btn-primary mt-auto w-full !py-2.5">
        Submit your site free →
      </button>
    </div>
  )
}
