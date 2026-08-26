'use client'

import { formatAgo, formatMoney, hostname } from '@/lib/format'
import { BID_INCREMENT_USD, MIN_BID_USD, type Site } from '@/lib/types'
import { Favicon, VerifiedMark } from './ui'

/**
 * Records the click, then lets the link open. `keepalive` survives the tab
 * losing focus, and nothing is awaited — counting must never delay the
 * navigation the visitor asked for.
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

/**
 * The rank circle. The site holding #1 with a paid bid gets the flame and the
 * boost colour, because that spot is the whole product — everything below it
 * is just a queue for it.
 */
function RankBadge({ rank, boosted }: { rank: number; boosted: boolean }) {
  const champion = boosted && rank === 1

  const tone = champion
    ? 'bg-[#ea580c] text-white'
    : boosted
      ? 'bg-brand text-white'
      : rank <= 3
        ? 'bg-[#e9e9e9] text-body'
        : 'bg-fill text-muted'

  return (
    <span
      className={`num flex h-6 shrink-0 items-center justify-center gap-0.5 rounded-full text-[11px] font-bold ${champion ? 'w-auto px-1.5' : 'w-6'} ${tone}`}
    >
      {champion ? <span aria-hidden>🔥</span> : null}
      {champion ? `#${rank}` : rank}
    </span>
  )
}

export default function SitesTable({
  sites,
  total,
  topBid,
  loading,
  error,
  onLoadMore,
  onSelect,
  onBid,
}: {
  sites: Site[]
  total: number
  /** Board-wide highest bid, from the server, so search cannot lower it. */
  topBid: number
  loading: boolean
  error: string | null
  onLoadMore: () => void
  onSelect: (site: Site) => void
  onBid: (site: Site) => void
}) {
  // What the next bid costs anywhere on the board, so the price of the top
  // spot is never a click away. Taken from the server rather than the rows on
  // screen: a search showing only unbid sites would otherwise quote $1 for a
  // spot the server will not sell below the real top bid.
  const nextBid = Math.max(MIN_BID_USD, topBid + BID_INCREMENT_USD)

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
      <ul>
        {sites.map((site, index) => {
          const rank = index + 1

          return (
            <li
              key={site.id}
              onClick={() => onBid(site)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onBid(site)
                }
              }}
              className="group flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-3 transition last:border-0 hover:bg-subtle focus:bg-subtle focus:outline-none sm:gap-3 sm:px-4"
            >
              <RankBadge rank={rank} boosted={site.is_boosted} />
              <Favicon name={site.name} size={30} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* The link opens the site; the rest of the row bids. */}
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={(event) => {
                      event.stopPropagation()
                      trackClick(site.url)
                    }}
                    className="truncate text-[13.5px] font-semibold text-ink hover:text-brand"
                  >
                    {site.name}
                  </a>
                  {site.revenue_verified ? <VerifiedMark /> : null}
                  {site.is_boosted ? (
                    <span className="rounded bg-[#ea580c]/[0.1] px-1.5 py-[2px] font-mono text-[9.5px] font-semibold tracking-wide text-[#ea580c]">
                      🔥 BOOSTED
                    </span>
                  ) : null}
                </div>

                <p className="mt-0.5 line-clamp-1 text-[12px] text-body">{site.description}</p>

                {/* Revenue is deliberately absent. A row that showed
                    "$208,827" next to a "$1" button had people reading the
                    six-figure number as the price of bidding; it now appears
                    only in Top earners and the site drawer, where nothing is
                    for sale. */}
                <div className="num mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-muted">
                  <span className="truncate">{hostname(site.url)}</span>
                  <span>{formatAgo(site.created_at)}</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-money" />
                    {site.clicks.toLocaleString('en-US')} clicks
                  </span>
                </div>
              </div>

              {/* The only numbers on this side of the row are what the site
                  holds and what it costs to take it, so the button's price is
                  never confused with anything else. */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                {site.is_boosted ? (
                  <span className="num text-[10.5px] font-semibold text-[#ea580c]">
                    holds at {formatMoney(site.bid_amount)}
                  </span>
                ) : null}

                <span className="num inline-flex items-center rounded-md bg-brand px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition group-hover:bg-brand-dark">
                  {/* Outbidding the leader is priced off that row's own bid;
                      taking an unbid spot is priced off the board's top bid,
                      since any boost has to clear it to rank at all. */}
                  {site.is_boosted
                    ? `outbid for ${formatMoney(site.bid_amount + BID_INCREMENT_USD)}`
                    : `bid ↑ ${formatMoney(nextBid)}`}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-center gap-2.5 border-t border-line bg-subtle py-4">
        <p className="num text-[11.5px] text-muted">
          Showing {sites.length} of {total} {total === 1 ? 'site' : 'sites'}
          {sites.length < total ? null : <span className="ml-1.5">· that&apos;s all of them</span>}
        </p>

        {error ? <p className="text-[11.5px] text-down">{error}</p> : null}

        {sites.length < total ? (
          <button type="button" onClick={onLoadMore} disabled={loading} className="btn-ghost">
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
