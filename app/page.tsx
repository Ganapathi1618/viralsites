import DirectoryView from '@/components/DirectoryView'
import PageShell from '@/components/PageShell'
import { getDirectoryData } from '@/lib/data'

// Re-fetch from Supabase at most once a minute, so new submissions and scraper
// writes appear without a redeploy.
export const revalidate = 60

export default async function HomePage() {
  const { sites, total, topEarners, leftSlots, rightSlots, stats, isLive, error } =
    await getDirectoryData()

  return (
    <PageShell stats={stats} leftSlots={leftSlots} rightSlots={rightSlots}>
      <DirectoryView
        adSlots={[...leftSlots, ...rightSlots]}
        initialSites={sites}
        total={total}
        topEarners={topEarners}
        stats={stats}
        isLive={isLive}
        error={error}
      />
    </PageShell>
  )
}
