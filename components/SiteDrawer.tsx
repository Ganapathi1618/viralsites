'use client'

import { formatMoney, formatMonthYear, hostname } from '@/lib/format'
import { MODEL_EXPLAINERS, MODEL_LABELS, type Site } from '@/lib/types'
import { Favicon, ModelTag, TrendCell, VerifiedMark, useEscape, useScrollLock } from './ui'

/**
 * Revenue history needs a time series the schema does not store yet — only the
 * current figure and a trend percentage. Rather than draw a fake chart, the
 * drawer reconstructs the two points it can defend: the previous reading
 * implied by the trend, and today's figure.
 */
function RevenueBars({ site }: { site: Site }) {
  const trend = site.trend_percent
  if (!trend || trend <= -100) return null

  const previous = site.revenue_amount / (1 + trend / 100)
  const points = [
    { label: 'previous', value: previous },
    { label: 'now', value: site.revenue_amount },
  ]
  const peak = Math.max(...points.map((point) => point.value)) || 1

  return (
    <div>
      <p className="label mb-2">Revenue movement</p>
      <div className="flex items-end gap-3 rounded-lg border border-line bg-subtle p-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="num text-[11px] font-semibold text-ink">{formatMoney(point.value)}</span>
            <div
              className={`w-full rounded-t ${point.label === 'now' ? 'bg-money' : 'bg-money/25'}`}
              style={{ height: `${Math.max(8, (point.value / peak) * 64)}px` }}
            />
            <span className="text-[10px] text-muted">{point.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[10.5px] text-muted">
        Two readings, derived from the current figure and its trend. Not a full history.
      </p>
    </div>
  )
}

export default function SiteDrawer({ site, onClose }: { site: Site | null; onClose: () => void }) {
  useEscape(Boolean(site), onClose)
  useScrollLock(Boolean(site))

  if (!site) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 animate-fade-in bg-ink/25" onClick={onClose} aria-hidden />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={site.name}
        className="absolute right-0 top-0 flex h-full w-full max-w-[400px] animate-slide-in flex-col border-l border-line bg-page"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Favicon name={site.name} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-[15px] font-semibold text-ink">{site.name}</h2>
                {site.revenue_verified ? <VerifiedMark /> : null}
              </div>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="num block truncate text-[11.5px] text-muted hover:text-brand"
              >
                {hostname(site.url)}
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-1.5 text-muted transition hover:bg-fill hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="scroll-area flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <p className="text-[13px] leading-relaxed text-body">{site.description}</p>

          <div className="rounded-lg border border-line p-4">
            <p className="label">Revenue</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="num text-[26px] font-bold leading-none text-money">
                {formatMoney(site.revenue_amount)}
              </span>
              <TrendCell percent={site.trend_percent} />
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted">
              {site.revenue_verified
                ? 'Verified against a public post.'
                : 'Estimated — no public source attached yet.'}
            </p>
            {site.revenue_source_url ? (
              <a
                href={site.revenue_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[12px] font-medium text-brand hover:underline"
              >
                Source: public post ↗
              </a>
            ) : null}
          </div>

          <RevenueBars site={site} />

          <div>
            <p className="label mb-2">Model</p>
            <div className="flex items-center gap-2">
              <ModelTag model={site.model_type} />
              <span className="text-[12.5px] font-medium text-ink">{MODEL_LABELS[site.model_type]}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">
              {MODEL_EXPLAINERS[site.model_type]}
            </p>
          </div>

          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-[12.5px] text-muted">Launched</span>
            <span className="num text-[12.5px] font-medium text-ink">
              {formatMonthYear(site.launched_at)}
            </span>
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn-primary w-full !py-2.5"
          >
            Visit site →
          </a>
          <a
            href={`mailto:hello@viralsites.fyi?subject=${encodeURIComponent(`Incorrect data: ${site.name}`)}`}
            className="mt-2.5 block text-center text-[11.5px] text-muted hover:text-ink hover:underline"
          >
            Report incorrect data
          </a>
        </div>
      </aside>
    </div>
  )
}
