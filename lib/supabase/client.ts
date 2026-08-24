import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** True when the public Supabase env vars are present. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Read-only client used by server components to render the directory.
 * Returns null when Supabase is not configured, which lets the app boot with
 * the bundled demo data instead of crashing on a fresh clone.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}
