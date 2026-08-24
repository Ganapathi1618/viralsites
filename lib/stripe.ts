import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY

export const isStripeConfigured = Boolean(secretKey && process.env.STRIPE_AD_SLOT_PRICE_ID)

let cached: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!secretKey) return null
  if (!cached) cached = new Stripe(secretKey, { apiVersion: '2024-06-20' })
  return cached
}

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
