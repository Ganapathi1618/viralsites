import { formatCompactMoney } from '@/lib/format'
import type { Stats } from '@/lib/types'

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex-1 px-4 py-3.5 sm:px-5">
      <p className="label">{label}</p>
      <p className="num mt-1 text-xl font-semibold text-white sm:text-2xl">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-[11px] text-muted">{sub}</p> : null}
    </div>
  )
}

export default function StatsBar({ stats, isLive }: { stats: Stats; isLive: boolean }) {
  const fastest = stats.fastestTo10k

  return (
    <section className="panel divide-y divide-line sm:flex sm:divide-x sm:divide-y-0">
      <div className="flex items-center gap-2 px-4 py-3.5 sm:px-5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLive ? 'animate-pulse-dot bg-accent' : 'bg-muted'
          }`}
        />
        <span className="label">{isLive ? 'live' : 'demo data'}</span>
      </div>

      <Stat
        label="Total earned"
        value={formatCompactMoney(stats.totalRevenue)}
        sub="across every listed site"
      />
      <Stat
        label="Sites tracked"
        value={String(stats.totalSites)}
        sub="one page, one revenue model"
      />
      <Stat
        label="Fastest to $10K"
        value={fastest ? `${fastest.days}d` : '—'}
        sub={fastest ? fastest.name : 'no site has crossed $10K yet'}
      />
    </section>
  )
}
