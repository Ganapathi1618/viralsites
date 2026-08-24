import AppShell from '@/components/AppShell'
import { getDirectoryData } from '@/lib/data'

// The directory reflects scraper writes and new submissions, so it renders
// per request rather than at build time.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const data = await getDirectoryData()
  return <AppShell data={data} />
}
