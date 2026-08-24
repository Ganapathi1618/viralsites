import Link from 'next/link'
import { hostname } from '@/lib/format'
import { AD_SLOT_PRICE_USD, type AdSlot } from '@/lib/types'
import { Favicon } from './ui'

/** One sponsor card. Both rails render the same component. */
function FilledSlot({ slot }: { slot: AdSlot }) {
  return (
    <a
      href={slot.company_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block rounded-lg border border-line p-2.5 transition hover:border-[#dcdcdc] hover:bg-subtle"
    >
      <div className="flex items-center gap-2">
        <Favicon name={slot.company_name ?? '?'} size={20} />
        <span className="truncate text-[12.5px] font-semibold text-ink group-hover:text-brand">
          {slot.company_name}
        </span>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-body">{slot.one_liner}</p>
      {slot.company_url ? (
        <span className="num mt-1 block truncate text-[10.5px] text-muted">
          {hostname(slot.company_url)}
        </span>
      ) : null}
    </a>
  )
}

function OpenSlot() {
  return (
    <Link
      href="/advertise"
      className="block w-full rounded-lg border border-dashed border-line p-2.5 text-left transition hover:border-brand/40 hover:bg-brand/[0.03]"
    >
      <p className="num text-[13px] font-bold text-ink">${AD_SLOT_PRICE_USD}/mo</p>
      <p className="mt-0.5 text-[11.5px] font-medium text-brand">Grab this spot</p>
      <p className="mt-0.5 text-[10.5px] text-muted">Monthly · cancel anytime</p>
    </Link>
  )
}

export default function SponsorSlots({
  slots,
  heading = 'Sponsors',
}: {
  slots: AdSlot[]
  heading?: string
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <span className="label">{heading}</span>
        <Link href="/advertise" className="text-[11px] font-medium text-brand hover:underline">
          Advertise →
        </Link>
      </div>

      {slots.map((slot) =>
        slot.is_active ? (
          <FilledSlot key={slot.id} slot={slot} />
        ) : (
          <OpenSlot key={slot.id} />
        ),
      )}
    </section>
  )
}
