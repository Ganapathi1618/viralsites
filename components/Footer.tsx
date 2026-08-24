export default function Footer({ onSubmit }: { onSubmit?: () => void }) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-8 border-t border-line py-5">
      <div className="flex flex-col gap-3 text-[11.5px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} ViralSites.fyi — A directory of viral one-page money sites. Revenue figures are
          self-reported.
        </p>

        <nav className="flex items-center gap-4">
          <a href="/" className="transition hover:text-ink">
            Directory
          </a>
          <a href="/advertise" className="transition hover:text-ink">
            Advertise
          </a>
          {onSubmit ? (
            <button type="button" onClick={onSubmit} className="transition hover:text-ink">
              Submit
            </button>
          ) : (
            <a href="/submit" className="transition hover:text-ink">
              Submit
            </a>
          )}
        </nav>
      </div>
    </footer>
  )
}
