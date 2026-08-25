import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Probes the payment and analytics APIs and reports exactly what they answer.
 *
 * Both integrations were written against documentation that could not be
 * reached from the build environment, so the endpoint paths are informed
 * guesses. This tries every plausible one from the deployment — which *can*
 * reach them — and reports the status and a short body for each, so the
 * working shape can be identified in a single request instead of a guessing
 * loop.
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
  const datafastKey = process.env.DATAFAST_API_KEY?.trim()
  const websiteId =
    process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID?.trim() || 'dfid_vGpUzorjuNOwlhQikL4ui'
  const productId = process.env.DODO_BID_PRODUCT_ID?.trim()

  const env = {
    DODO_API_KEY: describe(dodoKey),
    DODO_BID_PRODUCT_ID: describe(productId),
    DODO_WEBHOOK_SECRET: describe(process.env.DODO_WEBHOOK_SECRET),
    DATAFAST_API_KEY: describe(datafastKey),
    NEXT_PUBLIC_DATAFAST_WEBSITE_ID: websiteId,
    SUPABASE_SERVICE_ROLE_KEY: describe(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  const datafast = datafastKey
    ? await probeAll(
        [
          `https://datafa.st/api/v1/websites/${websiteId}/live`,
          `https://datafa.st/api/v1/websites/${websiteId}/stats`,
          `https://datafa.st/api/v1/websites/${websiteId}`,
          `https://datafa.st/api/v1/stats?website_id=${websiteId}`,
          `https://datafa.st/api/v1/live?website_id=${websiteId}`,
          `https://api.datafa.st/v1/websites/${websiteId}/stats`,
          'https://datafa.st/api/v1/websites',
        ],
        { authorization: `Bearer ${datafastKey}`, accept: 'application/json' },
      )
    : 'DATAFAST_API_KEY not set'

  const dodo = dodoKey
    ? await probeAll(
        [
          'https://live.dodopayments.com/products',
          'https://live.dodopayments.com/payments',
          'https://api.dodopayments.com/products',
          'https://test.dodopayments.com/products',
        ],
        { authorization: `Bearer ${dodoKey}`, accept: 'application/json' },
      )
    : 'DODO_API_KEY not set'

  return NextResponse.json({ env, datafast, dodo }, { headers: { 'cache-control': 'no-store' } })
}

function describe(value: string | undefined) {
  if (!value) return 'MISSING'
  // Never echo a secret; length and prefix are enough to spot a paste error.
  return `set (${value.length} chars, starts "${value.slice(0, 4)}…")`
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
    const body = (await response.text()).slice(0, 300)
    return { status: response.status, body }
  } catch (error) {
    return { status: 0, body: `request failed: ${(error as Error).message}` }
  }
}
