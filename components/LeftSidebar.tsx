import SponsorSlots from './SponsorSlots'
import type { AdSlot } from '@/lib/types'

/** Left rail: sponsor slots 1-3. */
export default function LeftSidebar({ slots }: { slots: AdSlot[] }) {
  return <SponsorSlots slots={slots} />
}
