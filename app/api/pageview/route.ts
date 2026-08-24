import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'

export const runtime = 'nodejs'
// Must stay dynamic: with `revalidate` and no request input, Next prerenders a
// route at build time and freezes the answer.
export const dynamic = 'force-dynamic'

const NO_STORE = { 'cache-control': 'no-store' }

/** Current total. */
export async function GET() {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ views: 0 }, { headers: NO_STORE })

  const { data, error } = await supabase
    .from('page_views')
    .select('total_views')
    .eq('id', 'main')
    .maybeSingle()

  if (error) {
    console.error('[pageview] read failed:', error.message)
    return NextResponse.json({ views: 0 }, { headers: NO_STORE })
  }

  return NextResponse.json({ views: Number(data?.total_views ?? 0) }, { headers: NO_STORE })
}

/**
 * Records one view and returns the new total.
 *
 * The increment runs inside Postgres (see increment_page_views in the schema)
 * so simultaneous visitors cannot read the same number and both write back the
 * same +1. A failure here is never worth surfacing to the visitor — the page
 * has already rendered — so every error path returns a 200 with the count it
 * could get.
 */
export async function POST() {
  const supabase = getSupabaseAdmin() ?? getSupabase()
  if (!supabase) return NextResponse.json({ views: 0 }, { headers: NO_STORE })

  const { data, error } = await supabase.rpc('increment_page_views')

  if (!error) {
    return NextResponse.json({ views: Number(data ?? 0) }, { headers: NO_STORE })
  }

  console.error('[pageview] increment failed:', error.message)

  // The function is missing (migration not run yet): fall back to reading the
  // total so the header still shows something truthful.
  const { data: row } = await supabase
    .from('page_views')
    .select('total_views')
    .eq('id', 'main')
    .maybeSingle()

  return NextResponse.json({ views: Number(row?.total_views ?? 0) }, { headers: NO_STORE })
}
