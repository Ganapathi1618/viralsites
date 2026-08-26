'use client'

/**
 * Filter for the table.
 *
 * The query is handed straight up; the debounce and the request live in
 * DirectoryView, because it owns the rows the query replaces.
 */
export default function SearchBar({
  value,
  onChange,
  searching,
  resultCount,
}: {
  value: string
  onChange: (value: string) => void
  searching: boolean
  resultCount: number | null
}) {
  return (
    <div className="mt-4">
      <div className="relative">
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" strokeLinecap="round" />
        </svg>

        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by name or URL…"
          aria-label="Search the directory"
          className="field !pl-9 !pr-20"
        />

        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[11px] text-muted transition hover:text-ink"
          >
            {searching ? 'Searching…' : 'Clear'}
          </button>
        ) : null}
      </div>

      {value && !searching && resultCount !== null ? (
        <p className="num mt-1.5 text-[11.5px] text-muted">
          {resultCount === 0
            ? 'No match in the directory.'
            : `${resultCount} ${resultCount === 1 ? 'match' : 'matches'}`}
        </p>
      ) : null}
    </div>
  )
}
