import type { Metadata } from 'next'
import AdvertiseView from '@/components/AdvertiseView'
import PageShell from '@/components/PageShell'
import { getDirectoryData, getPageViews } from '@/lib/data'
import { AD_SLOT_PRICE_USD } from '@/lib/types'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Advertise',
  description: `Sponsor a slot on ViralSites.fyi — $${AD_SLOT_PRICE_USD} for a month during the launch deal.`,
}

export default async function AdvertisePage() {
  const [{ leftSlots, rightSlots, stats }, views] = await Promise.all([
    getDirectoryData(),
    getPageViews(),
  ])

  return (
    <PageShell stats={stats} views={views} leftSlots={leftSlots} rightSlots={rightSlots}>
      <AdvertiseView slots={[...leftSlots, ...rightSlots]} />
    </PageShell>
  )
}
