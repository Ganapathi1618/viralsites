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
}

export type AdSlot = {
  id: string
  position: number
  company_name: string | null
  company_url: string | null
  one_liner: string | null
  is_active: boolean
}

export type Submission = {
  id: string
  name: string
  url: string
  model_type: ModelType
  created_at: string
}

export type Stats = {
  totalEarned: number
  sitesTracked: number
  newest: { name: string; created_at: string } | null
  topThisWeek: { name: string; gain: number } | null
}

export type WeekStats = {
  newSites: number
  earnedThisWeek: number
  wentViral: number
}

export const AD_SLOT_PRICE_USD = 50
export const ONE_LINER_MAX = 60
