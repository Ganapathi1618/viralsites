import type { ModelType } from '@/lib/types'

const STYLES: Record<ModelType, string> = {
  bid: 'border-accent/30 bg-accent/10 text-accent',
  pixel: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  leaderboard: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  sponsor: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300',
}

export default function ModelBadge({ model }: { model: ModelType }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STYLES[model]}`}
    >
      {model}
    </span>
  )
}
