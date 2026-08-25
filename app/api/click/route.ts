import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Records an outbound click.
 *
 * Called just before the link opens, so it must never block or fail loudly —
 * the visitor is already on their way out. Every path returns 200.
 */
export async function POST(request: Request) {
  let url: string
  try {
    const body = (await request.json()) as { url?: unknown }
    url = String(body.url ?? '')
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Only count clicks on URLs we actually list, so the endpoint cannot be used
  // to write arbitrary rows.
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const supabase = getSupabaseAdmin() ?? getSupabase()
  if (!supabase) return NextResponse.json({ ok: false })

  const { data, error } = await supabase.rpc('increment_site_clicks', { site_url: url })

  if (error) {
    console.error('[click] increment failed:', error.message)
    return NextResponse.json({ ok: false })
  }

  return NextResponse.json({ ok: true, clicks: Number(data ?? 0) })
}
