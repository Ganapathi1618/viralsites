'use client'

import { formatMoney, formatMonthYear, hostname } from '@/lib/format'
import { BID_INCREMENT_USD, MIN_BID_USD, type Site } from '@/lib/types'
import { Favicon, ModelTag, TrendCell, VerifiedMark } from './ui'

/**
 * Records the click, then opens the site. `keepalive` lets the request survive
 * the tab losing focus, and nothing is awaited — a slow counter must never
 * delay the link the visitor actually asked for.
 */
function trackClick(url: string) {
  try {
    fetch('/api/click', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never let counting break navigation.
  }
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function SitesTable({
  sites,
  total,
  loading,
  error,
  onLoadMore,
  onSelect,
  onBid,
}: {
  sites: Site[]
  total: number
  loading: boolean
  error: string | null
  onLoadMore: () => void
  onSelect: (site: Site) => void
  onBid: (site: Site) => void
}) {
  // What the next bid costs anywhere on the board, shown on every row so the
  // price of the top spot is never a click away.
  const topBid = Math.max(0, ...sites.map((site) => (site.is_boosted ? site.bid_amount : 0)))
  const nextBid = Math.max(MIN_BID_USD, topBid + BID_INCREMENT_USD)
  const shown = sites
  const hasMore = sites.length < total
  if (sites.length === 0) {
    return (
      <div className="rounded-lg border border-line px-6 py-14 text-center">
        <p className="text-[14px] font-medium text-ink">No sites listed yet.</p>
        <p className="mt-1 text-[12.5px] text-muted">
          The table is empty — be the first to{' '}
          <a href="/submit" className="text-brand hover:underline">
            submit one
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left sm:min-w-[760px]">
          <thead>
            <tr className="border-b border-line bg-subtle">
              <th className="label w-8 px-2 py-2.5 sm:w-12 sm:px-3">#</th>
              <th className="label px-3 py-2.5">Site</th>
              <th className="label hidden w-32 px-3 py-2.5 sm:table-cell">Model</th>
              <th className="label w-32 px-3 py-2.5 text-right">Revenue</th>
              <th className="label w-24 px-3 py-2.5 text-right">Trend</th>
              <th className="label hidden w-28 px-3 py-2.5 text-right sm:table-cell">Launched</th>
            </tr>
          </thead>

          <tbody>
            {shown.map((site, index) => (
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          onClick={(event) => {
                            event.stopPropagation()
                            trackClick(site.url)
                          }}
                          className="truncate text-[13.5px] font-semibold text-ink hover:text-brand group-hover:text-brand"
                        >
                          {site.name}
                        </a>
                        {site.revenue_verified ? <VerifiedMark /> : null}
                        {site.is_boosted ? (
                          <span className="inline-flex items-center rounded bg-[#ea580c]/[0.1] px-1.5 py-[2px] font-mono text-[9.5px] font-semibold tracking-wide text-[#ea580c]">
                            🔥 BOOSTED
                          </span>
                        ) : null}
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
                  <span className="num mt-0.5 block text-[10.5px] text-muted">
                    {site.clicks.toLocaleString('en-US')} clicks
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

                <td className="px-3 py-3 text-right align-top">
                  <TrendCell percent={site.trend_percent} />
                  {site.is_boosted ? (
                    <span className="num mt-0.5 block text-[10px] font-semibold text-[#ea580c]">
                      bid {formatMoney(site.bid_amount)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onBid(site)
                    }}
                    className="num mt-1 whitespace-nowrap rounded border border-line px-1.5 py-[3px] text-[10px] font-semibold text-muted transition hover:border-[#ea580c]/40 hover:text-[#ea580c]"
                  >
                    Bid ↑ {formatMoney(nextBid)}
                  </button>
                </td>

                <td className="num hidden px-3 py-3 text-right text-[11.5px] text-muted sm:table-cell">
                  {formatMonthYear(site.launched_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2.5 border-t border-line bg-subtle py-4">
        <p className="num text-[11.5px] text-muted">
          Showing {shown.length} of {total} {total === 1 ? 'site' : 'sites'}
          {/* Say so explicitly: a missing button otherwise reads as broken. */}
          {hasMore ? null : <span className="ml-1.5">· that&apos;s all of them</span>}
        </p>

        {error ? <p className="text-[11.5px] text-down">{error}</p> : null}

        {hasMore ? (
          <button type="button" onClick={onLoadMore} disabled={loading} className="btn-ghost">
            {loading ? 'Loading…' : 'Load more'}
            {loading ? null : (
              <span className="num text-[11px] text-muted">+{Math.min(10, total - shown.length)}</span>
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}
