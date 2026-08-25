export const MODEL_TYPES = ['bid', 'pixel', 'leaderboard', 'sponsor', 'other'] as const
export type ModelType = (typeof MODEL_TYPES)[number]

export function isModelType(value: unknown): value is ModelType {
  return typeof value === 'string' && (MODEL_TYPES as readonly string[]).includes(value)
}

export const MODEL_LABELS: Record<ModelType, string> = {
  bid: 'Live Bidding',
  pixel: 'Pixel Sales',
  leaderboard: 'Leaderboard',
  sponsor: 'Sponsorship',
  other: 'Other',
}

export const MODEL_TAGS: Record<ModelType, string> = {
  bid: 'BID',
  pixel: 'PIXEL',
  leaderboard: 'LEADERBOARD',
  sponsor: 'SPONSOR',
  other: 'OTHER',
}

/** How each model actually makes money — shown in the site drawer. */
export const MODEL_EXPLAINERS: Record<ModelType, string> = {
  bid: 'A single spot is for sale. Whoever pays most holds it until someone pays more, and the previous holder is bumped.',
  pixel: 'The page is a fixed grid. Each cell sells once, so revenue is capped by the grid and front-loaded at launch.',
  leaderboard: 'A public ranking where position is bought, earned, or both. Revenue recurs because rank decays.',
  sponsor: 'Fixed slots sold on a subscription. Predictable revenue, capped by how many slots the page can carry.',
  other: 'A one-page model that does not fit the usual four.',
}

export type Site = {
  id: string
  name: string
  url: string
  description: string
  model_type: ModelType
  revenue_amount: number
  revenue_verified: boolean
  revenue_source_url: string | null
  trend_percent: number | null
  launched_at: string | null
  is_featured: boolean
  created_at: string
  clicks: number
  bid_amount: number
  bid_expires_at: string | null
  /** True while a paid boost is live; computed by the sites_ranked view. */
  is_boosted: boolean
}

/**
 * Floor for a boost bid, and how long one lasts. A bid must also beat the
 * highest live bid by at least a dollar, so this floor only applies to the
 * very first bid on an empty board.
 */
export const MIN_BID_USD = 1
export const BID_INCREMENT_USD = 1
export const BOOST_HOURS = 24

export type AdSlot = {
  id: string
  position: number
  company_name: string | null
  company_url: string | null
  one_liner: string | null
  is_active: boolean
}

export type Stats = {
  /** Sum of revenue_amount across every row, not just the page on screen. */
  totalEarned: number
  sitesTracked: number
  newest: { name: string; created_at: string } | null
  topEarner: { name: string; revenue: number } | null
}

/** Launch offer: a flat $5 for a five-day run, i.e. $1/day. */
export const LAUNCH_PRICE_USD = 5
export const LAUNCH_DAYS = 5

/** What a slot costs once the launch offer closes. */
export const AD_SLOT_PRICE_USD = 50

/**
 * When the launch price ends. No timezone suffix, so it resolves to midnight
 * in the visitor's own timezone — a countdown that hits zero at a moment the
 * reader recognises beats one that expires at an arbitrary local hour.
 */
export const LAUNCH_ENDS_AT = '2026-08-30T00:00:00'

/**
 * Hosted Dodo Payments checkout. Overridable per deployment, since the link
 * changes if the product is recreated.
 */
export const DODO_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_DODO_CHECKOUT_URL || 'https://dodo.pe/ba68w4xy495'
export const ONE_LINER_MAX = 60
