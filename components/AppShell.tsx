'use client'

import { useEffect, useMemo, useState } from 'react'
import AdvertiseForm from './AdvertiseForm'
import FilterTabs, { applyFilter, type FilterId } from './FilterTabs'
import Header from './Header'
import LeftSidebar from './LeftSidebar'
import Modal from './Modal'
import RightSidebar from './RightSidebar'
import SiteDrawer from './SiteDrawer'
import SitesTable from './SitesTable'
import StatsBar from './StatsBar'
import SubmitForm from './SubmitForm'
import type { DirectoryData } from '@/lib/data'
import type { Site } from '@/lib/types'

export default function AppShell({ data }: { data: DirectoryData }) {
  const { sites, adSlots, submissions, stats, week, isLive } = data

  const [filter, setFilter] = useState<FilterId>('all')
  const [drawerSite, setDrawerSite] = useState<Site | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [advertiseOpen, setAdvertiseOpen] = useState(false)
  const [slotPosition, setSlotPosition] = useState<number | undefined>()

  const visible = useMemo(() => applyFilter(sites, filter), [sites, filter])
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
            ? "Payment received — your slot goes live once we add your copy. Check your email."
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

      {/* Three columns: the sidebars are fixed, only the middle scrolls. */}
      <div className="mx-auto max-w-shell px-4 pt-14 lg:h-screen">
        <div className="lg:flex lg:h-full lg:gap-6">
          <aside className="hidden shrink-0 py-5 lg:block lg:w-[200px]">
            <div className="scroll-area h-full overflow-y-auto pr-1">
              <LeftSidebar slots={adSlots} onAdvertise={openAdvertise} />
            </div>
          </aside>

          <main className="scroll-area min-w-0 flex-1 py-5 lg:h-full lg:overflow-y-auto">
            <div className="mb-4">
              <h1 className="text-[19px] font-bold tracking-tight text-ink">
                Viral one-page money sites
              </h1>
              <p className="mt-0.5 text-[12.5px] text-muted">
                One page, one gimmick, real revenue. Figures sourced from public posts on X.
              </p>
            </div>

            <StatsBar stats={stats} isLive={isLive} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <FilterTabs active={filter} onChange={setFilter} sites={sites} />
              <span className="num text-[11.5px] text-muted">
                {visible.length} {visible.length === 1 ? 'site' : 'sites'}
              </span>
            </div>

            <div className="mt-3 pb-8">
              <SitesTable sites={visible} onSelect={setDrawerSite} />

              <p className="mt-4 text-center text-[11px] text-muted">
                Revenue is self-reported or scraped from public pages. Verified means someone
                checked it against a public post — not that it is audited.
              </p>
            </div>

            {/* The sidebars are desktop-fixed; below lg they stack here. */}
            <div className="grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:hidden">
              <LeftSidebar slots={adSlots} onAdvertise={openAdvertise} />
              <RightSidebar
                topEarners={leaders}
                submissions={submissions}
                week={week}
                onSubmit={() => setSubmitOpen(true)}
              />
            </div>
          </main>

          <aside className="hidden shrink-0 py-5 lg:block lg:w-[200px]">
            <div className="scroll-area h-full overflow-y-auto pl-1">
              <RightSidebar
                topEarners={leaders}
                submissions={submissions}
                week={week}
                onSubmit={() => setSubmitOpen(true)}
              />
            </div>
          </aside>
        </div>
      </div>

      <SiteDrawer site={drawerSite} onClose={() => setDrawerSite(null)} />

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="List your site"
        subtitle="Free. Reviewed within 24 hours."
      >
        <SubmitForm onDone={() => setSubmitOpen(false)} />
      </Modal>

      <Modal
        open={advertiseOpen}
        onClose={() => setAdvertiseOpen(false)}
        title="Get in front of indie hackers"
        subtitle="A fixed sidebar slot on every page view."
      >
        <AdvertiseForm slots={adSlots} position={slotPosition} />
      </Modal>
    </>
  )
}
