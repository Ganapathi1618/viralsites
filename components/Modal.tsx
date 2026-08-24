'use client'

import { useEscape, useScrollLock } from './ui'

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-[460px]',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  width?: string
}) {
  useEscape(open, onClose)
  useScrollLock(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="fixed inset-0 animate-fade-in bg-ink/25 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative my-auto w-full animate-pop-in rounded-xl border border-line bg-page shadow-[0_16px_48px_-12px_rgba(0,0,0,0.16)] ${width}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md p-1.5 text-muted transition hover:bg-fill hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
