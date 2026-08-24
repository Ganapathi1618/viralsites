import ModelBadge from './ModelBadge'
import { formatCompactMoney, formatRelative, hostname } from '@/lib/format'
import type { Site, Submission } from '@/lib/types'

const MEDALS = ['text-accent', 'text-white', 'text-amber-300']

function TopEarners({ sites }: { sites: Site[] }) {
  return (
    <div className="panel p-3">
      <h2 className="label mb-3">Top earners</h2>

      <ol className="space-y-1">
        {sites.map((site, index) => (
          <li key={site.id}>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group flex items-center gap-2.5 rounded-md px-2 py-2 transition hover:bg-raised"
            >
              <span
                className={`num w-4 text-[12px] font-semibold ${
                  MEDALS[index] ?? 'text-muted'
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-white transition group-hover:text-accent">
                  {site.name}
                </span>
                <span className="num block truncate text-[10.5px] text-muted/70">
                  {hostname(site.url)}
                </span>
              </span>
              <span className="num text-[12.5px] font-semibold text-accent">
                {formatCompactMoney(site.revenue)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

function RecentlySubmitted({ submissions }: { submissions: Submission[] }) {
  return (
    <div className="panel p-3">
      <h2 className="label mb-3">Recently submitted</h2>

      {submissions.length === 0 ? (
        <p className="px-2 py-3 text-[12.5px] text-muted">Nothing submitted yet.</p>
      ) : (
        <ul className="space-y-1">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <a
                href={submission.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group block rounded-md px-2 py-2 transition hover:bg-raised"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] text-white transition group-hover:text-accent">
                    {submission.name}
                  </span>
                  <ModelBadge model={submission.model_type} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="num text-[11px] text-muted">
                    {formatRelative(submission.submitted_at)}
                  </span>
                  <span className="num text-[11.5px] text-muted">
                    {formatCompactMoney(submission.revenue)}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function RightSidebar({
  topEarners,
  submissions,
}: {
  topEarners: Site[]
  submissions: Submission[]
}) {
  return (
    <aside className="space-y-3">
      <TopEarners sites={topEarners} />
      <RecentlySubmitted submissions={submissions} />
    </aside>
  )
}
