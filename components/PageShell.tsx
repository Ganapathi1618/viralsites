'use client'

import { useCallback, useEffect, useState } from 'react'
import Footer from './Footer'
import Header from './Header'
import LeftSidebar from './LeftSidebar'
import Modal from './Modal'
import RightSidebar from './RightSidebar'
import SubmitForm from './SubmitForm'
import Ticker from './Ticker'
import type { AdSlot, Stats } from '@/lib/types'

/**
 * The three-column frame shared by every page: fixed header, both sponsor
 * rails pinned to the viewport, and a single scrolling middle column.
 *
 * The rails never scroll — three compact cards plus the CTA fit inside the
 * viewport. Below lg they drop into the flow and the page scrolls normally.
 */
export default function PageShell({
  stats,
  views,
  leftSlots,
  rightSlots,
  children,
}: {
  stats: Stats
  views: number
  leftSlots: AdSlot[]
  rightSlots: AdSlot[]
  children: React.ReactNode
}) {
  const [submitOpen, setSubmitOpen] = useState(false)
  // The ticker is fixed, so everything below it has to shift by its height.
  // One CSS variable drives the header offset, the content padding and the
  // rails' viewport-height maths, so they can never disagree.
  const [bannerHeight, setBannerHeight] = useState('2.25rem')

  // Stable identity so the ticker's mount effect does not re-run on every
  // render of this component.
  const hideBanner = useCallback(() => setBannerHeight('0px'), [])

  // Dodo and Stripe both send buyers back with a ?checkout= flag.
  const [checkoutState, setCheckoutState] = useState<string | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const state = params.get('checkout')
    if (!state) return
    setCheckoutState(state)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  return (
    <div style={{ '--banner-h': bannerHeight } as React.CSSProperties}>
      <Ticker sitesTracked={stats.sitesTracked} onDismiss={hideBanner} />

      <Header stats={stats} views={views} onSubmit={() => setSubmitOpen(true)} />

      {checkoutState ? (
        <div
          className={`fixed left-1/2 top-[calc(4rem+var(--banner-h,0px))] z-[80] -translate-x-1/2 animate-pop-in rounded-lg border px-4 py-2.5 text-[12.5px] shadow-sm ${
            checkoutState === 'success'
              ? 'border-money/25 bg-money/[0.08] text-money'
              : 'border-line bg-page text-body'
          }`}
        >
          {checkoutState === 'success'
            ? 'Payment received — your slot goes live once we add your copy. Check your email.'
            : 'Checkout cancelled. Nothing was charged.'}
          <button
            type="button"
            onClick={() => setCheckoutState(null)}
            className="ml-3 text-muted hover:text-ink"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="mx-auto max-w-shell px-4 pt-[calc(3.5rem+var(--banner-h,0px))] lg:h-screen">
        <div className="lg:flex lg:h-full lg:gap-6">
          <aside className="hidden shrink-0 lg:block lg:h-[calc(100vh-3.5rem-var(--banner-h,0px))] lg:w-[200px] lg:overflow-hidden lg:py-4">
            <LeftSidebar slots={leftSlots} />
          </aside>

          <main className="scroll-area min-w-0 flex-1 py-5 lg:h-full lg:overflow-y-auto">
            {children}

            {/* The rails are desktop-only above; below lg they stack here. */}
            <div className="mt-6 grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:hidden">
              <LeftSidebar slots={leftSlots} />
              <RightSidebar slots={rightSlots} onSubmit={() => setSubmitOpen(true)} />
            </div>

            <Footer onSubmit={() => setSubmitOpen(true)} />
          </main>

          <aside className="hidden shrink-0 lg:block lg:h-[calc(100vh-3.5rem-var(--banner-h,0px))] lg:w-[200px] lg:overflow-hidden lg:py-4">
            <RightSidebar slots={rightSlots} onSubmit={() => setSubmitOpen(true)} />
          </aside>
        </div>
      </div>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="List your site"
        subtitle="Free. Live in the directory straight away."
      >
        <SubmitForm onDone={() => setSubmitOpen(false)} />
      </Modal>
    </div>
  )
}
