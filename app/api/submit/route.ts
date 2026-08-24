import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupabase } from '@/lib/supabase/client'
import { isModelType } from '@/lib/types'

export const runtime = 'nodejs'

type Payload = {
  name?: unknown
  url?: unknown
  description?: unknown
  model_type?: unknown
  revenue?: unknown
  source_link?: unknown
}

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

export async function POST(request: Request) {
  let body: Payload
  try {
    body = (await request.json()) as Payload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const url = cleanUrl(body.url)
  const sourceLink = cleanUrl(body.source_link)
  const revenue = Number(body.revenue)

  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'Give the site a name (80 characters or fewer).' }, { status: 400 })
  }
  if (!url) {
    return NextResponse.json({ error: 'Enter a valid http(s) URL.' }, { status: 400 })
  }
  if (!description || description.length > 280) {
    return NextResponse.json({ error: 'Describe the gimmick in 280 characters or fewer.' }, { status: 400 })
  }
  if (!isModelType(body.model_type)) {
    return NextResponse.json({ error: 'Pick a model type.' }, { status: 400 })
  }
  if (!Number.isFinite(revenue) || revenue < 0 || revenue > 1_000_000_000) {
    return NextResponse.json({ error: 'Revenue must be a number between 0 and 1,000,000,000.' }, { status: 400 })
  }

  // Prefer the service role client so submissions land even with strict RLS;
  // fall back to the anon client, which the insert policy allows.
  const supabase = getSupabaseAdmin() ?? getSupabase()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Submissions are not wired up yet — Supabase is not configured on this deployment.' },
      { status: 503 },
    )
  }

  const { error } = await supabase.from('submissions').insert({
    name,
    url,
    description,
    model_type: body.model_type,
    revenue,
    source_link: sourceLink,
  })

  if (error) {
    console.error('[submit] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save the submission. Try again shortly.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
