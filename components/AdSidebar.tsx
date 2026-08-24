import Link from 'next/link'
import BuySlotButton from './BuySlotButton'
import { hostname } from '@/lib/format'
import { AD_SLOT_PRICE_USD, type AdSlot } from '@/lib/types'

function FilledSlot({ slot }: { slot: AdSlot }) {
  return (
    <a
      href={slot.url ?? '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block rounded-md border border-line bg-raised p-3 transition hover:border-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-white transition group-hover:text-accent">
          {slot.company_name}
        </span>
        <span className="num text-[10px] text-muted">{String(slot.position).padStart(2, '0')}</span>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-muted">{slot.description}</p>
      {slot.url ? (
        <span className="num mt-1.5 block text-[10.5px] text-muted/70">{hostname(slot.url)}</span>
      ) : null}
    </a>
  )
}

function OpenSlot({ slot }: { slot: AdSlot }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-surface/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="label">Open slot</span>
        <span className="num text-[10px] text-muted">{String(slot.position).padStart(2, '0')}</span>
      </div>
      <p className="num mt-1 text-[15px] font-semibold text-accent">
        ${AD_SLOT_PRICE_USD}
        <span className="text-[11px] font-normal text-muted">/month</span>
      </p>
      <BuySlotButton
        position={slot.position}
        className="btn-ghost mt-2 w-full !py-1.5 !text-[12px]"
        label="Claim slot"
      />
    </div>
  )
}

export default function AdSidebar({ slots }: { slots: AdSlot[] }) {
  const openCount = slots.filter((slot) => !slot.is_filled).length

  return (
    <aside className="space-y-3">
      <div className="panel p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="label">Sponsors</h2>
          <span className="num text-[10px] text-muted">{openCount} open</span>
        </div>

        <div className="space-y-2">
          {slots.map((slot) =>
            slot.is_filled ? (
              <FilledSlot key={slot.id} slot={slot} />
            ) : (
              <OpenSlot key={slot.id} slot={slot} />
            ),
          )}
        </div>

        <Link
          href="/advertise"
          className="mt-3 block text-center text-[11.5px] text-muted transition hover:text-accent"
        >
          How sponsorship works →
        </Link>
      </div>
    </aside>
  )
}
