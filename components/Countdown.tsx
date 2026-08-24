'use client'

import { useEffect, useState } from 'react'
import { LAUNCH_ENDS_AT } from '@/lib/types'

type Remaining = { days: number; hours: number; minutes: number; seconds: number } | null

function remainingUntil(target: number): Remaining {
  const ms = target - Date.now()
  if (ms <= 0) return null

  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1_000) % 60,
  }
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="num text-[26px] font-bold leading-none text-down">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  )
}

/** Counts down to the end of the launch price. */
export default function Countdown() {
  const target = new Date(LAUNCH_ENDS_AT).getTime()

  // Starts null so the server and the first client render agree; the real
  // figures arrive on the first tick.
  const [left, setLeft] = useState<Remaining>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLeft(remainingUntil(target))
    setReady(true)

    const timer = setInterval(() => setLeft(remainingUntil(target)), 1_000)
    return () => clearInterval(timer)
  }, [target])

  if (!ready) return null

  if (!left) {
    return (
      <p className="text-[12.5px] font-medium text-muted">
        The launch price has ended — slots are now ${50}/month.
      </p>
    )
  }

  return (
    <div>
      <p className="text-[11.5px] font-medium text-body">Price increases in:</p>
      <div className="mt-2 flex items-start gap-4">
        <Unit value={left.days} label="days" />
        <Unit value={left.hours} label="hrs" />
        <Unit value={left.minutes} label="min" />
        <Unit value={left.seconds} label="sec" />
      </div>
    </div>
  )
}
