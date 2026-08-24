import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-8 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="text-white">ViralSites.fyi</span> — a directory of one-page money
          sites. Revenue figures are self-reported or scraped from public sources.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/submit" className="transition hover:text-accent">
            Submit
          </Link>
          <Link href="/advertise" className="transition hover:text-accent">
            Advertise
          </Link>
          <span className="font-mono">refreshed every 6h</span>
        </div>
      </div>
    </footer>
  )
}
