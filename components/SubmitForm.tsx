'use client'

import { useState } from 'react'
import { MODEL_LABELS, MODEL_TYPES, ONE_LINER_MAX } from '@/lib/types'

type Status = { kind: 'idle' | 'sending' | 'done' } | { kind: 'error'; message: string }

export default function SubmitForm({ onDone }: { onDone?: () => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [oneLiner, setOneLiner] = useState('')
  const [name, setName] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  /**
   * Auto-fill the site name from the URL's page title. Best effort only: a site
   * that blocks server-side fetches just leaves the field for the user.
   */
  async function lookupTitle(event: React.FocusEvent<HTMLInputElement>) {
    const url = event.target.value.trim()
    if (!url || name.trim()) return

    setLookingUp(true)
    try {
      const response = await fetch(`/api/site-meta?url=${encodeURIComponent(url)}`)
      const payload = (await response.json()) as { title?: string }
      if (payload.title) setName(payload.title)
    } catch {
      // Leave the field empty; the user can type it.
    } finally {
      setLookingUp(false)
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())

    setStatus({ kind: 'sending' })

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        setStatus({ kind: 'error', message: payload.error ?? 'Something went wrong.' })
        return
      }

      form.reset()
      setOneLiner('')
      setName('')
      setStatus({ kind: 'done' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error. Try again.' })
    }
  }

  if (status.kind === 'done') {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-money/10">
          <svg viewBox="0 0 20 20" className="h-5 w-5 text-money" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-3 text-[14px] font-semibold text-ink">Got it.</p>
        <p className="mt-1 text-[12.5px] text-muted">
          We&apos;ll review and add your site within 24 hours.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={() => setStatus({ kind: 'idle' })} className="btn-ghost">
            Submit another
          </button>
          {onDone ? (
            <button type="button" onClick={onDone} className="btn-primary">
              Done
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      <div>
        <label className="field-label" htmlFor="sf-url">
          Site URL *
        </label>
        <input
          id="sf-url"
          name="url"
          type="url"
          required
          onBlur={lookupTitle}
          placeholder="https://outbid.lol"
          className="field"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="sf-name">
          Site name * {lookingUp ? <span className="text-muted">· fetching…</span> : null}
        </label>
        <input
          id="sf-name"
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="outbid.lol"
          className="field"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="sf-oneliner">
          One-liner *
          <span className={`float-right num ${oneLiner.length > ONE_LINER_MAX - 10 ? 'text-down' : 'text-muted'}`}>
            {oneLiner.length}/{ONE_LINER_MAX}
          </span>
        </label>
        <input
          id="sf-oneliner"
          name="one_liner"
          required
          maxLength={ONE_LINER_MAX}
          value={oneLiner}
          onChange={(event) => setOneLiner(event.target.value)}
          placeholder="Pay more than the person above you."
          className="field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="sf-model">
            Model *
          </label>
          <select id="sf-model" name="model_type" defaultValue="bid" className="field">
            {MODEL_TYPES.map((model) => (
              <option key={model} value={model}>
                {MODEL_LABELS[model]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="sf-launched">
            Launch date
          </label>
          <input id="sf-launched" name="launched_at" type="date" className="field" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="sf-revenue">
            Revenue earned
          </label>
          <input
            id="sf-revenue"
            name="revenue_amount"
            inputMode="numeric"
            placeholder="$2,300"
            className="field font-mono"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="sf-source">
            Revenue source
          </label>
          <input id="sf-source" name="revenue_source_url" type="url" placeholder="x.com post" className="field" />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="sf-email">
          Your email
        </label>
        <input id="sf-email" name="submitter_email" type="email" placeholder="you@example.com" className="field" />
        <p className="mt-1 text-[11px] text-muted">For updates only. Never shown publicly.</p>
      </div>

      {status.kind === 'error' ? (
        <p className="rounded-lg bg-down/[0.08] px-3 py-2 text-[12px] text-down">{status.message}</p>
      ) : null}

      <button type="submit" disabled={status.kind === 'sending'} className="btn-primary w-full !py-2.5">
        {status.kind === 'sending' ? 'Submitting…' : 'Submit site'}
      </button>
    </form>
  )
}
