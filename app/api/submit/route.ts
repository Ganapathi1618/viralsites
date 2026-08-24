import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'
import { ONE_LINER_MAX, isModelType } from '@/lib/types'

export const runtime = 'nodejs'

function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = new URL(value.trim())
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

/** Accepts "$2,300", "2300", "2.3k" — anything a founder would actually type. */
function parseRevenue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const text = String(value).trim()
  const match = text.match(/^\$?\s*([\d,]+(?:\.\d+)?)\s*([kKmM])?$/)
  if (!match) return null

  const amount = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount < 0) return null

  const suffix = match[2]?.toLowerCase()
  if (suffix === 'k') return amount * 1_000
  if (suffix === 'm') return amount * 1_000_000
  return amount
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const oneLiner = typeof body.one_liner === 'string' ? body.one_liner.trim() : ''
  const url = cleanUrl(body.url)
  const sourceUrl = cleanUrl(body.revenue_source_url)
  const email = typeof body.submitter_email === 'string' ? body.submitter_email.trim() : ''
  const launchedAt = typeof body.launched_at === 'string' && body.launched_at ? body.launched_at : null

  if (!url) return NextResponse.json({ error: 'Enter a valid http(s) URL.' }, { status: 400 })
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'Give the site a name (80 characters or fewer).' }, { status: 400 })
  }
  if (!oneLiner || oneLiner.length > ONE_LINER_MAX) {
    return NextResponse.json(
      { error: `Describe it in ${ONE_LINER_MAX} characters or fewer.` },
      { status: 400 },
    )
  }
  if (!isModelType(body.model_type)) {
    return NextResponse.json({ error: 'Pick a model type.' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 })
  }

  const revenue = parseRevenue(body.revenue_amount)
  if (body.revenue_amount && revenue === null) {
    return NextResponse.json({ error: 'Revenue should be a number, e.g. $2,300.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin() ?? getSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Submissions are not wired up on this deployment yet.' },
      { status: 503 },
    )
  }

  const { error } = await supabase.from('submissions').insert({
    url,
    name,
    one_liner: oneLiner,
    model_type: body.model_type,
    revenue_amount: revenue,
    revenue_source_url: sourceUrl,
    launched_at: launchedAt,
    submitter_email: email || null,
  })

  if (error) {
    console.error('[submit] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save that. Try again shortly.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
