import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-safe Supabase client.
 *
 * NEXT_PUBLIC_ variables are inlined at build time, so these must be set on the
 * build, not just at runtime — adding them to Vercel after a deploy needs a
 * redeploy to take effect. Values are trimmed because a trailing newline
 * pasted into a dashboard field produces a URL that fails to parse.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && anonKey)

let cached: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null

  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  return cached
}
