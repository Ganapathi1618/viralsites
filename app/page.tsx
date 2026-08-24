import DirectoryView from '@/components/DirectoryView'
import PageShell from '@/components/PageShell'
import { getDirectoryData } from '@/lib/data'

// The directory reflects scraper writes and new submissions, so it renders
// per request rather than at build time.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { sites, leftSlots, rightSlots, stats, isLive } = await getDirectoryData()

  return (
    <PageShell stats={stats} leftSlots={leftSlots} rightSlots={rightSlots}>
      <DirectoryView sites={sites} stats={stats} isLive={isLive} />
    </PageShell>
  )
}
