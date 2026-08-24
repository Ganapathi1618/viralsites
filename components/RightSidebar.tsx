'use client'

import { avatarColor, formatAgo, formatCompact, formatMoney, hostname } from '@/lib/format'
import type { Site, Submission, WeekStats } from '@/lib/types'

function TopEarners({ sites }: { sites: Site[] }) {
  return (
    <section>
      <h2 className="label mb-2">Top earners</h2>
      <ol className="space-y-px">
        {sites.map((site, index) => (
          <li key={site.id}>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition hover:bg-subtle"
            >
              <span className="num w-3 shrink-0 text-[11px] font-semibold text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink group-hover:text-brand">
                  {site.name}
                </span>
                <span className="num block truncate text-[10px] text-muted">{hostname(site.url)}</span>
              </span>
              <span className="num shrink-0 text-[11.5px] font-semibold text-money">
                {formatCompact(site.revenue_amount)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

function JustSubmitted({ submissions }: { submissions: Submission[] }) {
  return (
    <section>
      <h2 className="label mb-2">Just submitted</h2>
      {submissions.length === 0 ? (
        <p className="px-1.5 text-[11.5px] text-muted">Nothing yet today.</p>
      ) : (
        <ul className="space-y-px">
          {submissions.map((submission) => (
            <li key={submission.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: avatarColor(submission.name) }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{submission.name}</span>
              <span className="num shrink-0 text-[10px] text-muted">{formatAgo(submission.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ThisWeek({ week }: { week: WeekStats }) {
  const rows: [string, string][] = [
    ['New sites', String(week.newSites)],
    ['Earned', formatMoney(week.earnedThisWeek)],
    ['Went viral', String(week.wentViral)],
  ]

  return (
    <section>
      <h2 className="label mb-2">This week</h2>
      <dl className="space-y-1.5 rounded-lg border border-line bg-subtle px-2.5 py-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11.5px] text-body">{label}</dt>
            <dd className="num text-[12px] font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function RightSidebar({
  topEarners,
  submissions,
  week,
  onSubmit,
}: {
  topEarners: Site[]
  submissions: Submission[]
  week: WeekStats
  onSubmit: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-5">
      <TopEarners sites={topEarners} />
      <JustSubmitted submissions={submissions} />
      <ThisWeek week={week} />

      <button type="button" onClick={onSubmit} className="btn-primary mt-auto w-full !py-2.5">
        Submit your site free →
      </button>
    </div>
  )
}
