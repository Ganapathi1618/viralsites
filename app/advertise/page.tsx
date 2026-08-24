import type { Metadata } from 'next'
import Link from 'next/link'
import BuySlotButton from '@/components/BuySlotButton'
import { getAdSlots } from '@/lib/data'
import { hostname } from '@/lib/format'
import { AD_SLOT_PRICE_USD } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Advertise',
  description: `Sponsor slots on ViralSites.fyi — $${AD_SLOT_PRICE_USD}/month, six slots, no rotation.`,
}

const SELLING_POINTS = [
  ['Six slots, no rotation', 'Your slot is yours. It is not a carousel and it is not an ad network.'],
  ['Above the fold', 'The sidebar sits beside the ranking table, on the page everyone actually lands on.'],
  ['Cancel any time', 'It is a plain Stripe subscription. Cancel from the receipt email.'],
  ['Audience', 'Indie hackers pricing out their own one-pager, and people who like watching numbers go up.'],
]

export default async function AdvertisePage() {
  const slots = await getAdSlots()
  const open = slots.filter((slot) => !slot.is_filled)
  const filled = slots.filter((slot) => slot.is_filled)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-[24px] font-bold tracking-tight">Advertise on ViralSites.fyi</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
        Six sidebar slots sit next to the directory. Three are taken. The rest are{' '}
        <span className="num text-accent">${AD_SLOT_PRICE_USD}/month</span> each, billed through
        Stripe.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {SELLING_POINTS.map(([title, body]) => (
          <div key={title} className="panel p-4">
            <h2 className="text-[13.5px] font-semibold text-white">{title}</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Open slots</h2>
          <span className="num text-[11.5px] text-muted">
            {open.length} of {slots.length} available
          </span>
        </div>

        {open.length === 0 ? (
          <div className="panel mt-3 px-5 py-8 text-center">
            <p className="text-[13.5px] text-white">Every slot is taken right now.</p>
            <p className="mt-1 text-[12.5px] text-muted">
              Check back — subscriptions free up as they lapse.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {open.map((slot) => (
              <div key={slot.id} className="panel flex flex-col p-4">
                <span className="label">Slot {String(slot.position).padStart(2, '0')}</span>
                <p className="num mt-2 text-2xl font-bold text-accent">
                  ${AD_SLOT_PRICE_USD}
                  <span className="text-[12px] font-normal text-muted">/mo</span>
                </p>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted">
                  Company name, one line of copy, and a followed-nowhere outbound link.
                </p>
                <div className="mt-4">
                  <BuySlotButton position={slot.position} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold">Currently sponsoring</h2>
        <div className="panel mt-3 divide-y divide-line">
          {filled.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-white">{slot.company_name}</p>
                <p className="truncate text-[12px] text-muted">{slot.description}</p>
              </div>
              {slot.url ? (
                <a
                  href={slot.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="num shrink-0 text-[11.5px] text-muted transition hover:text-accent"
                >
                  {hostname(slot.url)} ↗
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="panel mt-8 p-5">
        <h2 className="text-[14px] font-semibold">After you pay</h2>
        <ol className="mt-2 space-y-1.5 text-[12.5px] text-muted">
          <li>
            <span className="num text-accent">01</span> Stripe checkout takes the first month and
            starts the subscription.
          </li>
          <li>
            <span className="num text-accent">02</span> The webhook marks your slot filled and
            stores the subscription id.
          </li>
          <li>
            <span className="num text-accent">03</span> Reply to the Stripe receipt with your
            company name, one line of copy, and the URL. It goes live the same day.
          </li>
        </ol>
        <Link href="/" className="mt-4 inline-block text-[12.5px] text-accent hover:underline">
          ← Back to the directory
        </Link>
      </section>
    </main>
  )
}
