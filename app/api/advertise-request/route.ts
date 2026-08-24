import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'
import { ONE_LINER_MAX } from '@/lib/types'

export const runtime = 'nodejs'

/**
 * Records who is about to buy a slot, before the browser leaves for Dodo.
 *
 * The payment happens off-site with no webhook back, so this row is the only
 * record that a checkout was started — it is what a completed payment gets
 * matched against by hand.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const companyName = String(body.company_name ?? '').trim()
  const oneLiner = String(body.one_liner ?? '').trim()
  const email = String(body.email ?? '').trim()

  let companyUrl: string
  try {
    const parsed = new URL(String(body.company_url ?? ''))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
    companyUrl = parsed.toString()
  } catch {
    return NextResponse.json({ error: 'Enter a valid http(s) site URL.' }, { status: 400 })
  }

  if (!companyName || companyName.length > 40) {
    return NextResponse.json({ error: 'Enter a name (40 characters or fewer).' }, { status: 400 })
  }
  if (!oneLiner || oneLiner.length > ONE_LINER_MAX) {
    return NextResponse.json(
      { error: `Keep the one-liner to ${ONE_LINER_MAX} characters or fewer.` },
      { status: 400 },
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin() ?? getSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Ad requests are not wired up on this deployment yet.' },
      { status: 503 },
    )
  }

  const { error } = await supabase.from('advertise_requests').insert({
    company_name: companyName,
    company_url: companyUrl,
    one_liner: oneLiner,
    email,
    status: 'pending',
  })

  if (error) {
    console.error('[advertise] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save your details. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
