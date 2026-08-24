import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import SubmitForm from '@/components/SubmitForm'

export const metadata: Metadata = {
  title: 'Submit a site',
  description: 'Add a one-page money site to the ViralSites.fyi directory. Free.',
}

const RULES = [
  'One page. A nav bar and five routes makes it a startup, not a one-pager.',
  'It charges for something: a bid, a pixel, a rank, a sponsor slot.',
  'Revenue is public or provable — a screenshot, a dashboard, an X post.',
]

/** Standalone page for direct links and no-JS visitors; the modal is primary. */
export default function SubmitPage() {
  return (
    <main className="mx-auto max-w-[560px] px-4 py-12">
      <Link href="/" className="text-[12.5px] text-muted hover:text-brand">
        ← Directory
      </Link>

      <h1 className="mt-4 text-[22px] font-bold tracking-tight">List your site</h1>
      <p className="mt-1 text-[13px] text-muted">
        Free, and live in the directory the moment you submit.
      </p>

      <ul className="mt-5 space-y-1.5 rounded-lg border border-line bg-subtle p-4">
        {RULES.map((rule) => (
          <li key={rule} className="flex gap-2 text-[12.5px] text-body">
            <span className="text-brand">–</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-line p-5">
        <SubmitForm />
      </div>
      <Footer />
    </main>
  )
}
