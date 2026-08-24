import type { Metadata } from 'next'
import SubmitForm from '@/components/SubmitForm'

export const metadata: Metadata = {
  title: 'Submit a site',
  description: 'Add a one-page money site to the ViralSites.fyi directory.',
}

const RULES = [
  'One page. If it has a nav bar and five routes, it is a startup, not a viral one-pager.',
  'It has to charge for something: a bid, a pixel, a rank, a sponsor slot.',
  'Revenue is public or provable. A screenshot, a dashboard, a tweet.',
]

export default function SubmitPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-[24px] font-bold tracking-tight">Submit a site</h1>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Found a one-pager quietly printing money? Put it on the board.
      </p>

      <ul className="mt-5 space-y-1.5">
        {RULES.map((rule) => (
          <li key={rule} className="flex gap-2 text-[13px] text-muted">
            <span className="text-accent">–</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <SubmitForm />
      </div>
    </main>
  )
}
