import type { AdSlot, Site } from './types'

/**
 * Fallback content, used when Supabase is unconfigured or unreachable. Mirrors
 * the seed rows in supabase/schema.sql so the page looks identical before and
 * after the database is connected.
 */

const day = 86_400_000
const ago = (n: number) => new Date(Date.now() - n * day).toISOString()

type Seed = [string, string, string, Site['model_type'], number, boolean, number, string, boolean]

const SEEDS: Seed[] = [
  ['outbid.lol', 'https://outbid.lol', 'Pay more than the person above you and take the top slot.', 'bid', 230000, true, 12.4, '2025-05-01', true],
  ['million.dev', 'https://million.dev', 'A million pixels, sold once, a dollar at a time.', 'pixel', 180000, true, 3.1, '2025-01-01', true],
  ['theboard.fyi', 'https://theboard.fyi', 'A leaderboard of makers ranked by what they ship.', 'leaderboard', 92000, true, 8.7, '2025-03-01', true],
  ['pixelwall.io', 'https://pixelwall.io', 'Ten thousand pixels, resold every quarter.', 'pixel', 71000, false, 1.9, '2025-02-01', false],
  ['bidboard.co', 'https://bidboard.co', 'One board, one bid, highest offer holds the space.', 'bid', 55000, false, -2.4, '2025-04-01', false],
  ['outbid.fyi', 'https://outbid.fyi', 'A directory of sponsor boards and who is paying for them.', 'sponsor', 35000, true, 22.8, '2025-06-01', false],
  ['spotbid.xyz', 'https://spotbid.xyz', 'Auction a single spot, every single day.', 'bid', 12000, false, 41.2, '2025-07-01', false],
  ['rankme.fyi', 'https://rankme.fyi', 'Climb the rank by paying, or by shipping. Both work.', 'leaderboard', 8400, false, 16.5, '2025-07-01', false],
  ['pixelbid.app', 'https://pixelbid.app', 'Bid on a pixel. Outbid, and it changes hands.', 'bid', 6200, false, 57.9, '2025-08-01', false],
  ['outrank.io', 'https://outrank.io', 'A public ranking nobody can edit except with money.', 'leaderboard', 4800, false, 9.3, '2025-08-01', false],
]

export const DEMO_SITES: Site[] = SEEDS.map(
  ([name, url, description, model_type, revenue_amount, revenue_verified, trend_percent, launched_at, is_featured], index) => ({
    id: `demo-${index + 1}`,
    name,
    url,
    description,
    model_type,
    revenue_amount,
    revenue_verified,
    revenue_source_url: revenue_verified ? 'https://x.com/search?q=' + encodeURIComponent(name) : null,
    trend_percent,
    launched_at,
    is_featured,
    created_at: ago(index * 3 + 1),
  }),
)

export const DEMO_AD_SLOTS: AdSlot[] = [
  { id: 'slot-1', position: 1, company_name: 'outbid.lol', company_url: 'https://outbid.lol', one_liner: 'Pay more than the person above you.', is_active: true },
  { id: 'slot-2', position: 2, company_name: 'million.dev', company_url: 'https://million.dev', one_liner: 'A million pixels, a dollar each.', is_active: true },
  { id: 'slot-3', position: 3, company_name: 'theboard.fyi', company_url: 'https://theboard.fyi', one_liner: 'The leaderboard indie hackers watch.', is_active: true },
  { id: 'slot-4', position: 4, company_name: null, company_url: null, one_liner: null, is_active: false },
  { id: 'slot-5', position: 5, company_name: null, company_url: null, one_liner: null, is_active: false },
  { id: 'slot-6', position: 6, company_name: null, company_url: null, one_liner: null, is_active: false },
  { id: 'slot-7', position: 7, company_name: 'pixelwall.io', company_url: 'https://pixelwall.io', one_liner: 'Ten thousand pixels, resold quarterly.', is_active: true },
  { id: 'slot-8', position: 8, company_name: 'rankme.fyi', company_url: 'https://rankme.fyi', one_liner: 'Climb the rank by paying, or shipping.', is_active: true },
  { id: 'slot-9', position: 9, company_name: null, company_url: null, one_liner: null, is_active: false },
]
