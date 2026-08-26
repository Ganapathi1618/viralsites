import { NextResponse } from 'next/server'
import { candidateUrls, readTraffic } from '@/lib/datafast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Probes the Dodo and Datafast APIs and reports exactly what they answer.
 *
 * Neither host is reachable from the build environment, so this runs the same
 * calls from the deployment — which can reach them — and reports the status
 * and a short body for each, so a failing checkout or a blank header stat can
 * be diagnosed in one request instead of a guessing loop.
 *
 * Guarded by CRON_SECRET: it reveals which endpoints exist and the providers'
 * error text, which is not for the public. Secrets themselves are never
 * echoed — only whether each one is present and how long it is.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const provided = new URL(request.url).searchParams.get('key')

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const dodoKey = process.env.DODO_API_KEY?.trim()
  const productId = process.env.DODO_BID_PRODUCT_ID?.trim()
  const apiBase = (process.env.DODO_API_URL || 'https://live.dodopayments.com').replace(/\/$/, '')

  const datafastKey = process.env.DATAFAST_API_KEY?.trim()

  const env = {
    DATAFAST_API_KEY: describe(datafastKey),
    DODO_API_KEY: describe(dodoKey),
    DODO_BID_PRODUCT_ID: describe(productId),
    DODO_WEBHOOK_SECRET: describe(process.env.DODO_WEBHOOK_SECRET),
    DODO_API_URL: apiBase,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: describe(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  const dodo = dodoKey
    ? await probeAll(
        [`${apiBase}/products`, productId ? `${apiBase}/products/${productId}` : `${apiBase}/payments`],
        { authorization: `Bearer ${dodoKey}`, accept: 'application/json' },
      )
    : 'DODO_API_KEY not set'

  // The call the bid modal actually makes, priced at the $1 floor. It creates
  // a real checkout session that nobody pays, which is the only way to see
  // whether the live product accepts a per-bid amount override.
  const checkoutSession =
    dodoKey && productId
      ? await probeCheckout(apiBase, dodoKey, productId)
      : 'DODO_API_KEY or DODO_BID_PRODUCT_ID not set'

  // Every analytics path the header could read from, plus what the header
  // actually resolves to right now. One request says whether a blank badge is
  // a missing key, a wrong path, or a field name we did not expect.
  const urls = candidateUrls()
  const datafast = datafastKey
    ? {
        parsed: await readTraffic(datafastKey),
        raw: await probeAll([...urls.overview, ...urls.realtime], {
          authorization: `Bearer ${datafastKey}`,
          accept: 'application/json',
        }),
      }
    : 'DATAFAST_API_KEY not set'

  return NextResponse.json(
    { env, datafast, dodo, checkoutSession },
    { headers: { 'cache-control': 'no-store' } },
  )
}

function describe(value: string | undefined) {
  if (!value) return 'MISSING'
  // Never echo a secret; length and prefix are enough to spot a paste error.
  return `set (${value.length} chars, starts "${value.slice(0, 4)}…")`
}

async function probeCheckout(apiBase: string, apiKey: string, productId: string) {
  const body = {
    product_cart: [{ product_id: productId, quantity: 1, amount: 100 }],
    payment_link: true,
    customer: { email: 'diagnostics@viralsites.fyi' },
    metadata: { site_url: 'https://example.com', bid_amount: '1', type: 'bid' },
    return_url: 'https://viralsites.fyi/?boosted=true',
  }

  try {
    const response = await fetch(`${apiBase}/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify(body),
    })
    return { status: response.status, body: (await response.text()).slice(0, 600) }
  } catch (error) {
    return { status: 0, body: `request failed: ${(error as Error).message}` }
  }
}

async function probeAll(urls: string[], headers: Record<string, string>) {
  return Object.fromEntries(
    await Promise.all(urls.map(async (url) => [url, await probe(url, headers)])),
  )
}

async function probe(url: string, headers: Record<string, string>) {
  try {
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    const body = (await response.text()).slice(0, 700)
    return { status: response.status, body }
  } catch (error) {
    return { status: 0, body: `request failed: ${(error as Error).message}` }
  }
}
