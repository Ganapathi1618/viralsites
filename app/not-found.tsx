import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[420px] px-4 py-28">
      <p className="num text-[12.5px] font-semibold text-brand">404</p>
      <h1 className="mt-2 text-[20px] font-bold tracking-tight">That page is not for sale.</h1>
      <p className="mt-1.5 text-[13px] text-muted">Nothing lives at this URL. The directory does.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to the directory
      </Link>
    </main>
  )
}
