export const MODEL_TYPES = ['bid', 'pixel', 'leaderboard', 'sponsor'] as const

export type ModelType = (typeof MODEL_TYPES)[number]

export function isModelType(value: unknown): value is ModelType {
  return typeof value === 'string' && (MODEL_TYPES as readonly string[]).includes(value)
}

export type Site = {
  id: string
  name: string
  url: string
  description: string
  model_type: ModelType
  revenue: number
  prev_revenue: number | null
  launched_at: string | null
  is_verified: boolean
  source_link: string | null
  created_at: string
}

export type AdSlot = {
  id: string
  position: number
  company_name: string | null
  url: string | null
  description: string | null
  is_filled: boolean
  stripe_subscription_id: string | null
}

export type Submission = {
  id: string
  url: string
  name: string
  description: string
  model_type: ModelType
  revenue: number
  source_link: string | null
  submitted_at: string
}

export type Stats = {
  totalRevenue: number
  totalSites: number
  /** Days from launch to $10k for the fastest site that has crossed it. */
  fastestTo10k: { name: string; days: number } | null
}

export const AD_SLOT_PRICE_USD = 50
