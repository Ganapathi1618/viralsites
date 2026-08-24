'use client'

import SponsorSlots from './SponsorSlots'
import type { AdSlot } from '@/lib/types'

/** Left rail: sponsor positions 1-6. */
export default function LeftSidebar({
  slots,
  onAdvertise,
}: {
  slots: AdSlot[]
  onAdvertise: (position: number) => void
}) {
  return <SponsorSlots slots={slots} onAdvertise={onAdvertise} />
}
