import Link from 'next/link'

const NAV = [
  { href: '/', label: 'Directory' },
  { href: '/submit', label: 'Submit' },
  { href: '/advertise', label: 'Advertise' },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold tracking-tight">
            Viral<span className="text-accent">Sites</span>
          </span>
          <span className="font-mono text-[11px] text-muted transition group-hover:text-accent">
            .fyi
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-md px-3 py-1.5 text-[13px] text-muted transition hover:bg-raised hover:text-white sm:block"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/submit"
            className="ml-1 rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-ink transition hover:bg-accent-dim"
          >
            <span className="sm:hidden">Submit</span>
            <span className="hidden sm:inline">Submit a site</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
