'use client'

import { formatMoney, formatMonthYear, hostname } from '@/lib/format'
import type { Site } from '@/lib/types'
import { Favicon, ModelTag, TrendCell, VerifiedMark } from './ui'

const MEDALS = ['🥇', '🥈', '🥉']

export default function SitesTable({
  sites,
  onSelect,
}: {
  sites: Site[]
  onSelect: (site: Site) => void
}) {
  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-line px-6 py-14 text-center">
        <p className="text-[14px] font-medium text-ink">Nothing matches this filter.</p>
        <p className="mt-1 text-[12.5px] text-muted">Try another model, or submit a site you know.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-subtle">
              <th className="label w-12 px-3 py-2.5">#</th>
              <th className="label px-3 py-2.5">Site</th>
              <th className="label w-32 px-3 py-2.5">Model</th>
              <th className="label w-32 px-3 py-2.5 text-right">Revenue</th>
              <th className="label w-24 px-3 py-2.5 text-right">Trend</th>
              <th className="label w-28 px-3 py-2.5 text-right">Launched</th>
            </tr>
          </thead>

          <tbody>
            {sites.map((site, index) => (
              <tr
                key={site.id}
                onClick={() => onSelect(site)}
                tabIndex={0}
                role="button"
                aria-label={`Open details for ${site.name}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(site)
                  }
                }}
                className="group cursor-pointer border-b border-line last:border-0 transition hover:bg-subtle focus:bg-subtle focus:outline-none"
              >
                <td className="num px-3 py-3 align-middle text-[13px] text-muted">
                  {index < 3 ? <span className="text-[15px]">{MEDALS[index]}</span> : index + 1}
                </td>

                <td className="px-3 py-3">
                  <div className="flex items-start gap-2.5">
                    <Favicon name={site.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-semibold text-ink group-hover:text-brand">
                          {site.name}
                        </span>
                        {site.revenue_verified ? <VerifiedMark /> : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 max-w-md text-[12px] text-body">
                        {site.description}
                      </p>
                      <span className="num mt-0.5 block text-[10.5px] text-muted">
                        {hostname(site.url)}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <ModelTag model={site.model_type} />
                </td>

                <td className="px-3 py-3 text-right">
                  <span className="num block text-[13.5px] font-bold text-money">
                    {formatMoney(site.revenue_amount)}
                  </span>
                  <span className="mt-0.5 inline-flex items-center justify-end gap-1 text-[10.5px] text-muted">
                    {site.revenue_verified ? 'verified' : 'estimated'}
                    {site.revenue_verified && site.revenue_source_url ? (
                      <a
                        href={site.revenue_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Open the public post this figure came from"
                        className="text-brand hover:underline"
                      >
                        ↗
                      </a>
                    ) : null}
                  </span>
                </td>

                <td className="px-3 py-3 text-right">
                  <TrendCell percent={site.trend_percent} />
                </td>

                <td className="num px-3 py-3 text-right text-[11.5px] text-muted">
                  {formatMonthYear(site.launched_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
