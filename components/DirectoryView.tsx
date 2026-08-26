'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AddAndBidModal from './AddAndBidModal'
import BidModal from './BidModal'
import MobileAdGrid from './MobileAdGrid'
import BoostedStrip from './BoostedStrip'
import SearchBar from './SearchBar'
import SiteDrawer from './SiteDrawer'
import SitesTable from './SitesTable'
import StatsBar from './StatsBar'
import TopEarnersRow from './TopEarnersRow'
import { PAGE_SIZE, type SiteSummary } from '@/lib/data'
import type { AdSlot, Site, Stats } from '@/lib/types'

/** Middle column of the homepage. */
export default function DirectoryView({
  initialSites,
  total,
  topEarners,
  topBid,
  stats,
  isLive,
  error,
  adSlots = [],
}: {
  initialSites: Site[]
  total: number
  topEarners: SiteSummary[]
  /** Board-wide highest bid, from the server. Search must not change it. */
  topBid: number
  stats: Stats
  isLive: boolean
  error?: string
  /** All six slots, for the grid shown where the rails are hidden. */
  adSlots?: AdSlot[]
}) {
  const router = useRouter()

  const [sites, setSites] = useState<Site[]>(initialSites)
  const [count, setCount] = useState(total)
  const [drawerSite, setDrawerSite] = useState<Site | null>(null)
  const [bidSite, setBidSite] = useState<Site | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  // The term the rows on screen actually came from, so "no match" is only ever
  // shown for a search that has finished.
  const [appliedQuery, setAppliedQuery] = useState('')

  /**
   * A bidder returning from checkout arrives at a page that may have been
   * rendered before their payment landed. The webhook purges it, but this
   * browser could still be holding the old copy, so ask the server for the
   * current one — which is where their new rank is.
   */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('boosted') === 'true') {
      router.refresh()
    }
  }, [router])

  // Keep the table in step with a server re-render (a refresh after payment,
  // or a revalidation while the tab was open) — but never while a search is
  // showing, since the server's rows are the unfiltered board.
  useEffect(() => {
    if (appliedQuery) return
    setSites(initialSites)
    setCount(total)
  }, [initialSites, total, appliedQuery])

  /** Debounced search. The filter runs in Postgres, over every row. */
  const requestId = useRef(0)

  useEffect(() => {
    const term = query.trim()

    if (term === appliedQuery) return

    if (!term) {
      requestId.current += 1
      setSites(initialSites)
      setCount(total)
      setAppliedQuery('')
      setSearching(false)
      return
    }

    setSearching(true)
    const id = ++requestId.current

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/sites?limit=${PAGE_SIZE}&q=${encodeURIComponent(term)}`,
        )
        const payload = (await response.json()) as { sites?: Site[]; total?: number }

        // A slower earlier request must not overwrite a newer one's results.
        if (id !== requestId.current) return

        setSites(payload.sites ?? [])
        setCount(payload.total ?? 0)
        setAppliedQuery(term)
        setLoadError(null)
      } catch {
        if (id === requestId.current) setLoadError('Could not search. Try again.')
      } finally {
        if (id === requestId.current) setSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, appliedQuery, initialSites, total])

  /** Fetches the next page from Supabase by offset rather than slicing locally. */
  async function loadMore() {
    setLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(
        `/api/sites?offset=${sites.length}&limit=${PAGE_SIZE}&q=${encodeURIComponent(appliedQuery)}`,
      )
      const payload = (await response.json()) as { sites?: Site[]; error?: string }

      if (!response.ok || !payload.sites) {
        setLoadError(payload.error ?? 'Could not load more sites.')
        return
      }

      // Guard against a double click racing in the same rows twice.
      setSites((current) => {
        const seen = new Set(current.map((site) => site.id))
        return [...current, ...payload.sites!.filter((site) => !seen.has(site.id))]
      })
    } catch {
      setLoadError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const noMatch = appliedQuery !== '' && !searching && sites.length === 0

  return (
    <>
      <StatsBar stats={stats} isLive={isLive} />

      {error ? (
        <p className="mt-4 rounded-lg border border-down/25 bg-down/[0.06] px-4 py-3 text-[12.5px] text-down">
          The directory could not be loaded: {error}
          <span className="mt-1 block text-muted">
            Check the deployment&apos;s Supabase credentials at <code>/api/health</code>.
          </span>
        </p>
      ) : null}

      <MobileAdGrid slots={adSlots} />

      <BoostedStrip sites={sites.filter((site) => site.is_boosted)} onOutbid={setBidSite} />

      <TopEarnersRow
        sites={[...topEarners].sort((a, b) => b.revenue_amount - a.revenue_amount)}
      />

      <SearchBar
        value={query}
        onChange={setQuery}
        searching={searching}
        resultCount={appliedQuery ? count : null}
      />

      {noMatch ? (
        <div className="mt-3 rounded-lg border border-dashed border-line bg-subtle px-4 py-6 text-center">
          <p className="text-[13.5px] font-semibold text-ink">
            <span className="num">{query.trim()}</span> is not listed yet.
          </p>
          <p className="mt-1 text-[12px] text-body">
            Add it and bid for the top spot in one step.
          </p>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-primary mt-3 !py-2.5 !text-[13px]"
          >
            Add + Bid →
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <SitesTable
            sites={sites}
            total={count}
            topBid={topBid}
            loading={loading}
            error={loadError}
            onLoadMore={loadMore}
            onSelect={setDrawerSite}
            onBid={setBidSite}
          />
        </div>
      )}

      <SiteDrawer site={drawerSite} onClose={() => setDrawerSite(null)} />

      <BidModal
        // Remounted per site and per price, so the amount box always opens at
        // the current floor rather than whatever was typed last time.
        key={`${bidSite?.id ?? 'none'}:${topBid}`}
        site={bidSite}
        topBid={topBid}
        onClose={() => setBidSite(null)}
      />

      <AddAndBidModal
        key={`add:${query.trim()}:${topBid}`}
        open={addOpen}
        initialQuery={query.trim()}
        topBid={topBid}
        onClose={() => setAddOpen(false)}
      />
    </>
  )
}
