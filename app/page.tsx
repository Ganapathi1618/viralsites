import AdSidebar from '@/components/AdSidebar'
import DirectoryTable from '@/components/DirectoryTable'
import FilterTabs from '@/components/FilterTabs'
import RightSidebar from '@/components/RightSidebar'
import StatsBar from '@/components/StatsBar'
import { filterByModel, getDirectoryData, topEarners } from '@/lib/data'
import { MODEL_TYPES, isModelType, type ModelType } from '@/lib/types'

// The directory reflects scraper writes, so it is rendered per request.
export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { model?: string }
}) {
  const { sites, adSlots, submissions, stats, isLive } = await getDirectoryData()

  const active: ModelType | 'all' = isModelType(searchParams.model) ? searchParams.model : 'all'
  const visible = filterByModel(sites, active)

  const counts = {
    all: sites.length,
    ...Object.fromEntries(
      MODEL_TYPES.map((model) => [model, sites.filter((site) => site.model_type === model).length]),
    ),
  } as Record<ModelType | 'all', number>

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px]">
          Viral one-page money sites
        </h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-muted">
          One page. One gimmick. Real revenue. Ranked by what they have earned, refreshed from
          public sources every six hours.
        </p>
      </div>

      <StatsBar stats={stats} isLive={isLive} />

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_260px]">
        <div className="order-2 lg:order-1">
          <div className="lg:sticky lg:top-20">
            <AdSidebar slots={adSlots} />
          </div>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <FilterTabs active={active} counts={counts} />
            <span className="num text-[11px] text-muted">
              {visible.length} {visible.length === 1 ? 'site' : 'sites'}
            </span>
          </div>

          <DirectoryTable sites={visible} />
        </div>

        <div className="order-3">
          <div className="xl:sticky xl:top-20">
            <RightSidebar topEarners={topEarners(sites)} submissions={submissions} />
          </div>
        </div>
      </div>
    </main>
  )
}
