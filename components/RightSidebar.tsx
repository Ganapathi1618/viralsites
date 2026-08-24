'use client'

import SponsorSlots from './SponsorSlots'
import type { AdSlot } from '@/lib/types'

/** Right rail: sponsor slots only, then the submit CTA. */
export default function RightSidebar({
  slots,
  onAdvertise,
  onSubmit,
}: {
  slots: AdSlot[]
  onAdvertise: (position: number) => void
  onSubmit: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <SponsorSlots slots={slots} onAdvertise={onAdvertise} />

      <button type="button" onClick={onSubmit} className="btn-primary mt-4 w-full !py-2">
        Submit your site free →
      </button>
    </div>
  )
}
