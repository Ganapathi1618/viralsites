import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'cache-control': 'no-store' }
/** Heartbeats arrive every 30s, so this tolerates three missed beats. */
const STALE_MINUTES = 2
const VALID_ID = /^[A-Za-z0-9_-]{8,64}$/

function cutoff(): string {
  return new Date(Date.now() - STALE_MINUTES * 60_000).toISOString()
}

export async function GET() {
  const admin = getSupabaseAdmin()
  if (admin) {
    const { count, error } = await admin
      .from('active_visitors')
      .select('id', { count: 'exact', head: true })
      .gt('last_seen', cutoff())
    if (!error) return NextResponse.json({ live: count ?? 0 }, { headers: NO_STORE })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ live: 0 }, { headers: NO_STORE })

  const { data } = await supabase.rpc('count_visitors')
  return NextResponse.json({ live: Number(data ?? 0) }, { headers: NO_STORE })
}

/** Sweep, record this session, count what is left. */
export async function POST(request: Request) {
  let id: string
  try {
    const body = (await request.json()) as { id?: unknown }
    id = String(body.id ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!VALID_ID.test(id)) {
    return NextResponse.json({ error: 'Invalid session id.' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (admin) {
    const stale = cutoff()
    await admin.from('active_visitors').delete().lt('last_seen', stale)

    const { error } = await admin
      .from('active_visitors')
      .upsert({ id, last_seen: new Date().toISOString() }, { onConflict: 'id' })

    if (!error) {
      const { count } = await admin
        .from('active_visitors')
        .select('id', { count: 'exact', head: true })
        .gt('last_seen', stale)
      return NextResponse.json({ live: count ?? 0 }, { headers: NO_STORE })
    }
    console.error('[visitor] upsert failed:', error.message)
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ live: 0 }, { headers: NO_STORE })

  const { data, error } = await supabase.rpc('touch_visitor', { visitor_id: id })
  if (error) {
    console.error('[visitor] touch_visitor failed:', error.message)
    return NextResponse.json({ live: 0 }, { headers: NO_STORE })
  }

  return NextResponse.json({ live: Number(data ?? 0) }, { headers: NO_STORE })
}
