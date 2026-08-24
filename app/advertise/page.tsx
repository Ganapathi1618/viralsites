import type { Metadata } from 'next'
import Link from 'next/link'
import AdvertiseForm from '@/components/AdvertiseForm'
import { getDirectoryData } from '@/lib/data'
import { AD_SLOT_PRICE_USD } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Advertise',
  description: `Sponsor slots on ViralSites.fyi — $${AD_SLOT_PRICE_USD}/month, six fixed slots, no rotation.`,
}

export default async function AdvertisePage() {
  const { adSlots } = await getDirectoryData()

  return (
    <main className="mx-auto max-w-[560px] px-4 py-12">
      <Link href="/" className="text-[12.5px] text-muted hover:text-brand">
        ← Directory
      </Link>

      <h1 className="mt-4 text-[22px] font-bold tracking-tight">Get in front of indie hackers</h1>
      <p className="mt-1 text-[13px] text-muted">
        A fixed slot in the sidebar of the directory, on every page view.
      </p>

      <div className="mt-6 rounded-xl border border-line p-5">
        <AdvertiseForm slots={adSlots} />
      </div>
    </main>
  )
}
