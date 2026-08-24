'use client'

import { useState } from 'react'
import { MODEL_TYPES } from '@/lib/types'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'ok' } | { kind: 'error'; message: string }

export default function SubmitForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

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
      setStatus({ kind: 'ok' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error. Try again.' })
    }
  }

  if (status.kind === 'ok') {
    return (
      <div className="panel p-6 text-center">
        <p className="text-[15px] font-semibold text-accent">Submitted.</p>
        <p className="mt-1.5 text-[13px] text-muted">
          It lands in the review queue and shows up in “Recently submitted” right away. Verified
          revenue gets a ✓ on the directory.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: 'idle' })}
          className="btn-ghost mt-4"
        >
          Submit another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Site name *</span>
          <input name="name" required maxLength={80} placeholder="Outbid.lol" className="field mt-1.5" />
        </label>

        <label className="block">
          <span className="label">URL *</span>
          <input
            name="url"
            required
            type="url"
            placeholder="https://outbid.lol"
            className="field mt-1.5"
          />
        </label>
      </div>

      <label className="block">
        <span className="label">What is the gimmick? *</span>
        <textarea
          name="description"
          required
          rows={3}
          maxLength={280}
          placeholder="Pay more than the person above you and take the top slot."
          className="field mt-1.5 resize-y"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Model type *</span>
          <select name="model_type" required defaultValue="bid" className="field mt-1.5">
            {MODEL_TYPES.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Revenue to date (USD) *</span>
          <input
            name="revenue"
            required
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="184320"
            className="field mt-1.5 font-mono"
          />
        </label>
      </div>

      <label className="block">
        <span className="label">Proof link</span>
        <input
          name="source_link"
          type="url"
          placeholder="https://x.com/… a public revenue screenshot or dashboard"
          className="field mt-1.5"
        />
        <span className="mt-1 block text-[11px] text-muted">
          Optional, but submissions with proof are the ones that get the ✓.
        </span>
      </label>

      {status.kind === 'error' ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
          {status.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={status.kind === 'sending'} className="btn-primary">
          {status.kind === 'sending' ? 'Submitting…' : 'Submit site'}
        </button>
        <span className="text-[11.5px] text-muted">Reviewed within 48 hours.</span>
      </div>
    </form>
  )
}
