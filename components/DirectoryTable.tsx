import ModelBadge from './ModelBadge'
import { formatDate, formatMoney, formatTrend, hostname, trendPercent } from '@/lib/format'
import type { Site } from '@/lib/types'

function Trend({ site }: { site: Site }) {
  const percent = trendPercent(site.revenue, site.prev_revenue)
  const tone =
    percent === null
      ? 'text-muted'
      : percent > 0
        ? 'text-accent'
        : percent < 0
          ? 'text-danger'
          : 'text-muted'
  const arrow = percent === null ? '·' : percent > 0 ? '▲' : percent < 0 ? '▼' : '–'

  return (
    <span className={`num text-[12px] ${tone}`}>
      {arrow} {formatTrend(percent)}
    </span>
  )
}

export default function DirectoryTable({ sites }: { sites: Site[] }) {
  if (sites.length === 0) {
    return (
      <div className="panel px-5 py-12 text-center">
        <p className="text-sm text-white">No sites match this filter yet.</p>
        <p className="mt-1 text-[13px] text-muted">
          Know one? <a href="/submit" className="text-accent hover:underline">Submit it</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-raised/60">
              <th className="label w-12 px-4 py-2.5 font-normal">#</th>
              <th className="label px-3 py-2.5 font-normal">Site</th>
              <th className="label w-32 px-3 py-2.5 font-normal">Model</th>
              <th className="label w-32 px-3 py-2.5 text-right font-normal">Revenue</th>
              <th className="label w-28 px-3 py-2.5 text-right font-normal">Trend</th>
              <th className="label w-32 px-4 py-2.5 text-right font-normal">Launched</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site, index) => (
              <tr
                key={site.id}
                className="group border-b border-line/70 transition last:border-0 hover:bg-raised/50"
              >
                <td className="num px-4 py-2.5 align-top text-[13px] text-muted">
                  {String(index + 1).padStart(2, '0')}
                </td>

                <td className="px-3 py-2.5 align-top">
                  <div className="flex items-center gap-2">
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-[14px] font-medium text-white transition group-hover:text-accent"
                    >
                      {site.name}
                    </a>
                    {site.is_verified ? (
                      <span
                        title="Revenue verified against a public source"
                        className="font-mono text-[10px] text-accent"
                      >
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-1 max-w-xl text-[12.5px] leading-snug text-muted">
                    {site.description}
                  </p>
                  <span className="num mt-0.5 inline-block text-[11px] text-muted/70">
                    {hostname(site.url)}
                  </span>
                </td>

                <td className="px-3 py-2.5 align-top">
                  <ModelBadge model={site.model_type} />
                </td>

                <td className="num px-3 py-2.5 text-right align-top text-[14px] font-semibold text-white">
                  {formatMoney(site.revenue)}
                </td>

                <td className="px-3 py-2.5 text-right align-top">
                  <Trend site={site} />
                </td>

                <td className="num px-4 py-2.5 text-right align-top text-[12px] text-muted">
                  {formatDate(site.launched_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
