import { formatAgo, formatMoney } from '@/lib/format'
import type { Stats } from '@/lib/types'

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="label">{label}</p>
      <p className="num mt-1 truncate text-[17px] font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-[11px] text-muted">{sub}</p> : null}
    </div>
  )
}

export default function StatsBar({ stats, isLive }: { stats: Stats; isLive: boolean }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-lg border border-line bg-subtle sm:grid-cols-4 sm:divide-y-0">
      <Cell
        label="Total earned"
        value={formatMoney(stats.totalEarned)}
        sub={isLive ? 'across every listed site' : 'demo data — Supabase not configured'}
      />
      <Cell label="Sites tracked" value={String(stats.sitesTracked)} sub="one page, one revenue model" />
      <Cell
        label="Newest site"
        value={stats.newest?.name ?? '—'}
        sub={stats.newest ? `added ${formatAgo(stats.newest.created_at)}` : undefined}
      />
      <Cell
        label="Top earner"
        value={stats.topEarner?.name ?? '—'}
        sub={stats.topEarner ? formatMoney(stats.topEarner.revenue) : undefined}
      />
    </div>
  )
}
