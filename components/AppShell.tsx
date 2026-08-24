'use client'

import { useEffect, useMemo, useState } from 'react'
import AdvertiseForm from './AdvertiseForm'
import Footer from './Footer'
import Header from './Header'
import LeftSidebar from './LeftSidebar'
import Modal from './Modal'
import RightSidebar from './RightSidebar'
import SiteDrawer from './SiteDrawer'
import SitesTable, { PAGE_SIZE } from './SitesTable'
import StatsBar from './StatsBar'
import SubmitForm from './SubmitForm'
import TopEarnersRow from './TopEarnersRow'
import type { DirectoryData } from '@/lib/data'
import type { Site } from '@/lib/types'

export default function AppShell({ data }: { data: DirectoryData }) {
  const { sites, leftSlots, rightSlots, stats, isLive } = data

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [drawerSite, setDrawerSite] = useState<Site | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [advertiseOpen, setAdvertiseOpen] = useState(false)
  const [slotPosition, setSlotPosition] = useState<number | undefined>()

  const leaders = useMemo(
    () => [...sites].sort((a, b) => b.revenue_amount - a.revenue_amount).slice(0, 5),
    [sites],
  )

  // Stripe sends the buyer back with ?checkout=success.
  const [checkoutState, setCheckoutState] = useState<string | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const state = params.get('checkout')
    if (!state) return
    setCheckoutState(state)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  function openAdvertise(position?: number) {
    setSlotPosition(position)
    setAdvertiseOpen(true)
  }

  return (
    <>
      <Header stats={stats} onSubmit={() => setSubmitOpen(true)} onAdvertise={() => openAdvertise()} />

      {checkoutState ? (
        <div
          className={`fixed left-1/2 top-16 z-[80] -translate-x-1/2 animate-pop-in rounded-lg border px-4 py-2.5 text-[12.5px] shadow-sm ${
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

      {/*
        Three columns. Both rails are pinned to exactly the viewport height
        below the header and never scroll — three compact slots plus the CTA
        fit inside it. Only the middle column scrolls. Below lg the rails move
        into the flow and the page scrolls normally.
      */}
      <div className="mx-auto max-w-shell px-4 pt-14 lg:h-screen">
        <div className="lg:flex lg:h-full lg:gap-6">
          <aside className="hidden shrink-0 lg:block lg:h-[calc(100vh-3.5rem)] lg:w-[200px] lg:overflow-hidden lg:py-4">
            <LeftSidebar slots={leftSlots} onAdvertise={openAdvertise} />
          </aside>

          <main className="scroll-area min-w-0 flex-1 py-5 lg:h-full lg:overflow-y-auto">
            <StatsBar stats={stats} isLive={isLive} />

            <TopEarnersRow sites={leaders} />

            <div className="mt-5">
              <SitesTable
                sites={sites}
                visibleCount={visibleCount}
                onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
                onSelect={setDrawerSite}
              />
            </div>

            {/* The rails are desktop-only above; below lg they stack here. */}
            <div className="mt-6 grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:hidden">
              <LeftSidebar slots={leftSlots} onAdvertise={openAdvertise} />
              <RightSidebar
                slots={rightSlots}
                onAdvertise={openAdvertise}
                onSubmit={() => setSubmitOpen(true)}
              />
            </div>

            <Footer
              onNavigate={(target) => (target === 'submit' ? setSubmitOpen(true) : openAdvertise())}
            />
          </main>

          <aside className="hidden shrink-0 lg:block lg:h-[calc(100vh-3.5rem)] lg:w-[200px] lg:overflow-hidden lg:py-4">
            <RightSidebar
              slots={rightSlots}
              onAdvertise={openAdvertise}
              onSubmit={() => setSubmitOpen(true)}
            />
          </aside>
        </div>
      </div>

      <SiteDrawer site={drawerSite} onClose={() => setDrawerSite(null)} />

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="List your site"
        subtitle="Free. Live in the directory straight away."
      >
        <SubmitForm onDone={() => setSubmitOpen(false)} />
      </Modal>

      <Modal
        open={advertiseOpen}
        onClose={() => setAdvertiseOpen(false)}
        title="Get in front of indie hackers"
        subtitle="A fixed sidebar slot on every page view."
      >
        <AdvertiseForm slots={[...leftSlots, ...rightSlots]} position={slotPosition} />
      </Modal>
    </>
  )
}
