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
 * viewport. Below lg both rails are hidden outright and the same six slots
 * appear once, as a 2x3 grid above the table, so a phone never renders the
 * sponsors twice.
 */
export default function PageShell({
  stats,
  leftSlots,
  rightSlots,
  children,
}: {
  stats: Stats
  leftSlots: AdSlot[]
  rightSlots: AdSlot[]
  children: React.ReactNode
}) {
  const [submitOpen, setSubmitOpen] = useState(false)
  // The ticker is fixed, so everything below it has to shift by its height.
  // One CSS variable drives the header offset, the content padding and the
  // rails' viewport-height maths, so they can never disagree.
  // Matches the ticker's height: h-8 on phones, h-9 from sm up.
  const [bannerHeight, setBannerHeight] = useState('2rem')

  // Stable identity so the ticker's mount effect does not re-run on every
  // render of this component.
  const hideBanner = useCallback(() => setBannerHeight('0px'), [])

  // The ticker is h-8 below sm and h-9 above it; keep the offset in step.
  useEffect(() => {
    function sync() {
      setBannerHeight((current) =>
        current === '0px' ? current : window.innerWidth >= 640 ? '2.25rem' : '2rem',
      )
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  // Sponsor checkouts come back with ?checkout=success|cancel; a paid bid
  // comes back with ?boosted=true. Both are cleared from the URL once read,
  // so a refresh does not re-announce a payment.
  const [checkoutState, setCheckoutState] = useState<'success' | 'cancel' | 'boosted' | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const state = params.get('boosted') === 'true' ? 'boosted' : params.get('checkout')
    if (state !== 'success' && state !== 'cancel' && state !== 'boosted') return
    setCheckoutState(state)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  return (
    <div style={{ '--banner-h': bannerHeight } as React.CSSProperties}>
      <Ticker sitesTracked={stats.sitesTracked} onDismiss={hideBanner} />

      <Header stats={stats} onSubmit={() => setSubmitOpen(true)} />

      {checkoutState ? (
        <div
          className={`fixed left-1/2 top-[calc(var(--header-h)+var(--banner-h,0px)+0.5rem)] z-[80] -translate-x-1/2 animate-pop-in rounded-lg border px-4 py-2.5 text-[12.5px] shadow-sm ${
            checkoutState === 'cancel'
              ? 'border-line bg-page text-body'
              : 'border-money/25 bg-money/[0.08] text-money'
          }`}
        >
          {checkoutState === 'boosted'
            ? 'Bid received — your spot goes live the moment the payment confirms. Refresh in a few seconds.'
            : checkoutState === 'success'
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

      <div className="mx-auto max-w-shell px-3 pt-[calc(var(--header-h)+var(--banner-h,0px))] sm:px-4 lg:h-screen">
        <div className="lg:flex lg:h-full lg:gap-6">
          <aside className="hidden shrink-0 lg:block lg:h-[calc(100vh-var(--header-h)-var(--banner-h,0px))] lg:w-[200px] lg:overflow-hidden lg:py-4">
            <LeftSidebar slots={leftSlots} />
          </aside>

          <main className="scroll-area min-w-0 flex-1 py-5 lg:h-full lg:overflow-y-auto">
            {children}

            <Footer onSubmit={() => setSubmitOpen(true)} />
          </main>

          <aside className="hidden shrink-0 lg:block lg:h-[calc(100vh-var(--header-h)-var(--banner-h,0px))] lg:w-[200px] lg:overflow-hidden lg:py-4">
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
