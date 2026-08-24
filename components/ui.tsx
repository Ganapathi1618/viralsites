'use client'

import { useEffect } from 'react'
import { avatarColor, initial } from '@/lib/format'
import { MODEL_TAGS, type ModelType } from '@/lib/types'

/** Letter badge standing in for a favicon — no external image requests. */
export function Favicon({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: avatarColor(name),
        fontSize: size * 0.44,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
    >
      {initial(name)}
    </span>
  )
}

const TAG_STYLES: Record<ModelType, string> = {
  bid: 'bg-[#0066ff]/[0.08] text-[#0066ff]',
  pixel: 'bg-[#7c3aed]/[0.08] text-[#7c3aed]',
  leaderboard: 'bg-[#ea580c]/[0.08] text-[#ea580c]',
  sponsor: 'bg-[#16a34a]/[0.08] text-[#16a34a]',
  other: 'bg-fill text-muted',
}

export function ModelTag({ model }: { model: ModelType }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-[3px] font-mono text-[10px] font-semibold tracking-wide ${TAG_STYLES[model]}`}
    >
      {MODEL_TAGS[model]}
    </span>
  )
}

export function VerifiedMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-3.5 w-3.5 shrink-0 text-brand ${className}`}
      fill="currentColor"
      role="img"
      aria-label="Revenue verified against a public source"
    >
      <path
        fillRule="evenodd"
        d="M10 1.6l2.1 1.5 2.6-.2.8 2.5 2.1 1.5-1 2.4 1 2.4-2.1 1.5-.8 2.5-2.6-.2L10 16.9l-2.1 1.5-2.6-.2-.8-2.5-2.1-1.5 1-2.4-1-2.4 2.1-1.5.8-2.5 2.6.2L10 1.6zm3.5 6.2l-1.1-1.1-3.3 3.3-1.5-1.5-1.1 1.1 2.6 2.6 4.4-4.4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function TrendCell({ percent }: { percent: number | null }) {
  if (percent === null || percent === undefined || Math.abs(percent) < 0.05) {
    return <span className="num text-[12.5px] text-muted">—</span>
  }

  const up = percent > 0
  return (
    <span className={`num inline-flex items-center gap-0.5 text-[12.5px] font-medium ${up ? 'text-money' : 'text-down'}`}>
      <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 ${up ? '' : 'rotate-180'}`} fill="currentColor" aria-hidden>
        <path d="M6 1.5l4.5 6H7.5v3h-3v-3h-3z" />
      </svg>
      {up ? '+' : ''}
      {percent.toFixed(1)}%
    </span>
  )
}

/** Locks background scroll while a modal or drawer is open. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}

/** Closes an overlay on Escape. */
export function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onClose])
}
