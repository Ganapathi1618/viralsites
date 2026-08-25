'use client'

import { useState } from 'react'
import BidModal from './BidModal'
import BoostedStrip from './BoostedStrip'
import SiteDrawer from './SiteDrawer'
import SitesTable from './SitesTable'
import StatsBar from './StatsBar'
import TopEarnersRow from './TopEarnersRow'
import { PAGE_SIZE, type SiteSummary } from '@/lib/data'
import type { Site, Stats } from '@/lib/types'

/** Middle column of the homepage. */
export default function DirectoryView({
  initialSites,
  total,
  topEarners,
  stats,
  isLive,
  error,
}: {
  initialSites: Site[]
  total: number
  topEarners: SiteSummary[]
  stats: Stats
  isLive: boolean
  error?: string
}) {
  const [sites, setSites] = useState<Site[]>(initialSites)
  const [drawerSite, setDrawerSite] = useState<Site | null>(null)
  const [bidSite, setBidSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  /** Fetches the next page from Supabase by offset rather than slicing locally. */
  async function loadMore() {
    setLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(`/api/sites?offset=${sites.length}&limit=${PAGE_SIZE}`)
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

      <BoostedStrip sites={sites.filter((site) => site.is_boosted)} onOutbid={setBidSite} />

      <TopEarnersRow
        sites={[...topEarners].sort((a, b) => b.revenue_amount - a.revenue_amount)}
      />

      <div className="mt-5">
        <SitesTable
          sites={sites}
          total={total}
          loading={loading}
          error={loadError}
          onLoadMore={loadMore}
          onSelect={setDrawerSite}
          onBid={setBidSite}
        />
      </div>

      <SiteDrawer site={drawerSite} onClose={() => setDrawerSite(null)} />

      <BidModal
        site={bidSite}
        // The highest live bid anywhere on the board is what a new bid must
        // beat, not just the bid on the row that was clicked.
        topBid={Math.max(0, ...sites.filter((site) => site.is_boosted).map((site) => site.bid_amount))}
        onClose={() => setBidSite(null)}
      />
    </>
  )
}
