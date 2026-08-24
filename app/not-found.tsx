import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="num text-[13px] text-accent">404</p>
      <h1 className="mt-2 text-[22px] font-bold tracking-tight">That page is not for sale.</h1>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Nothing lives at this URL. The directory does.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to the directory
      </Link>
    </main>
  )
}
