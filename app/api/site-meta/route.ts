import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Best-effort title lookup for the submit form's URL field. Any failure is a
 * quiet 200 with no title — the user just types the name themselves.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('url')
  if (!target) return NextResponse.json({ error: 'Missing url.' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(target.startsWith('http') ? target : `https://${target}`)
  } catch {
    return NextResponse.json({ error: 'Invalid url.' }, { status: 400 })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid url.' }, { status: 400 })
  }

  // Refuse private network addresses: this endpoint takes a user-supplied URL,
  // so it must not become an SSRF probe into the deployment's own network.
  if (isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Unsupported host.' }, { status: 400 })
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: { 'user-agent': 'ViralSitesBot/1.0 (+https://viralsites.fyi)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(6_000),
    })
    if (!response.ok) return NextResponse.json({ title: null })

    const html = (await response.text()).slice(0, 200_000)
    const match =
      html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i) ??
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)

    const title = match?.[1]
      ?.replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;|&apos;/g, "'")
      .trim()
      .slice(0, 80)

    return NextResponse.json({ title: title || null, host: parsed.hostname })
  } catch {
    return NextResponse.json({ title: null })
  }
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }
  return host === '::1' || host.startsWith('fd') || host.startsWith('fe80')
}
