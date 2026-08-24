import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

export const isAdminConfigured = Boolean(url && serviceKey)

let cached: SupabaseClient | null = null

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a client
 * component — only route handlers and the scraper use it.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!url || !serviceKey) return null

  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  return cached
}
