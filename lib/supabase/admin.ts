import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isAdminConfigured = Boolean(url && serviceKey)

/**
 * Service-role client. Bypasses RLS, so it must never be imported into a
 * client component — only route handlers and the scraper use it.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
