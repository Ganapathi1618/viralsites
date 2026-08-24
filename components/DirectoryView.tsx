'use client'

import { useMemo, useState } from 'react'
import SiteDrawer from './SiteDrawer'
import SitesTable, { PAGE_SIZE } from './SitesTable'
import StatsBar from './StatsBar'
import TopEarnersRow from './TopEarnersRow'
import type { Site, Stats } from '@/lib/types'

/** Middle column of the homepage. */
export default function DirectoryView({
  sites,
  stats,
  isLive,
}: {
  sites: Site[]
  stats: Stats
  isLive: boolean
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [drawerSite, setDrawerSite] = useState<Site | null>(null)

  const leaders = useMemo(
    () => [...sites].sort((a, b) => b.revenue_amount - a.revenue_amount).slice(0, 5),
    [sites],
  )

  return (
    <>
      <StatsBar stats={stats} isLive={isLive} />
      <TopEarnersRow sites={leaders} />

      <div className="mt-5">
        <SitesTable
          sites={sites}
          visibleCount={visibleCount}
          onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
          onSelect={setDrawerSite}
        />
      </div>

      <SiteDrawer site={drawerSite} onClose={() => setDrawerSite(null)} />
    </>
  )
}
