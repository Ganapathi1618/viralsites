/**
 * Reading Dodo's payment response.
 *
 * These live here rather than in the route because a Next.js route file may
 * only export its handlers and config — exporting a helper from one is a build
 * error, and they need exporting to be testable.
 */

/**
 * The payment link out of a Dodo response.
 *
 * `payment_link` is what `POST /payments` returns — e.g.
 * `{"payment_link": "https://checkout.dodopayments.com/QgxeGs2o"}`. The
 * remaining names are fallbacks, and `data` is checked as well as the top
 * level, so a response that gains an envelope does not become an outage.
 *
 * Only an http(s) string counts: the request body also carries a
 * `payment_link` key, set to `true`, and echoing that back as a URL would
 * send bidders to the string "true".
 */
export function firstUrl(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null

  const sources = [payload, payload.data as Record<string, unknown> | undefined].filter(
    Boolean,
  ) as Record<string, unknown>[]

  const keys = ['payment_link', 'url', 'checkout_url', 'payment_url', 'session_url', 'link']

  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'string' && /^https?:\/\//.test(value)) return value
    }
  }

  return null
}

/** Key names of a response, one level into `data`, for the log line. */
export function describeKeys(payload: Record<string, unknown>): string {
  const top = Object.keys(payload)
  const data = payload.data

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return `${top.join(', ')} (data: ${Object.keys(data as object).join(', ')})`
  }

  return top.join(', ')
}
