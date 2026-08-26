'use client'

import Link from 'next/link'
import { hostname } from '@/lib/format'
import { LAUNCH_DAYS, LAUNCH_PRICE_USD, type AdSlot } from '@/lib/types'
import { Favicon } from './ui'

/**
 * The sponsor rails as a 2x3 grid, for the widths where the rails are hidden.
 * Same `ad_slots` rows the desktop rails render, so a sold slot appears in
 * both without a second source of truth.
 */
export default function MobileAdGrid({ slots }: { slots: AdSlot[] }) {
  if (slots.length === 0) return null

  return (
    <section className="mt-4 lg:hidden">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">Sponsors</span>
        <Link href="/advertise" className="text-[11px] font-medium text-brand hover:underline">
          Advertise →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot) =>
          slot.is_active ? (
            <a
              key={slot.id}
              href={slot.company_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="rounded-lg border border-line p-2.5 transition hover:border-[#dcdcdc]"
            >
              <div className="flex items-center gap-1.5">
                <Favicon name={slot.company_name ?? '?'} size={18} />
                <span className="truncate text-[12px] font-semibold text-ink">
                  {slot.company_name}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-body">
                {slot.one_liner}
              </p>
              {slot.company_url ? (
                <span className="num mt-1 block truncate text-[9.5px] text-muted">
                  {hostname(slot.company_url)}
                </span>
              ) : null}
            </a>
          ) : (
            <Link
              key={slot.id}
              href="/advertise"
              className="rounded-lg border border-dashed border-line p-2.5 transition hover:border-brand/40"
            >
              <p className="label text-[9.5px]">Ad slot #{slot.position}</p>
              <p className="num mt-1 text-[12px] font-bold text-ink">
                ${LAUNCH_PRICE_USD} for {LAUNCH_DAYS} days
              </p>
              <p className="mt-1 text-[10px] font-semibold text-brand">TAKE THIS SPOT</p>
            </Link>
          ),
        )}
      </div>
    </section>
  )
}
