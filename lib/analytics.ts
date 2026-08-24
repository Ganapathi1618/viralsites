/**
 * Umami configuration, shared by the tracking tag and the stats endpoint.
 *
 * The website id falls back to the production value so tracking works even when
 * the env var is missing from a deployment. A Umami website id is public by
 * design — it ships in the page source of every site that uses one. The API key
 * has no fallback and never leaves the server.
 */

const FALLBACK_WEBSITE_ID = '7ef035e8-f978-47fe-a1f9-c42e3f978f77'

export function umamiWebsiteId(): string {
  return process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() || FALLBACK_WEBSITE_ID
}

export function umamiScriptSrc(): string {
  return process.env.NEXT_PUBLIC_UMAMI_SRC?.trim() || 'https://cloud.umami.is/script.js'
}

export function umamiApiUrl(): string {
  return (process.env.UMAMI_API_URL?.trim() || 'https://api.umami.is/v1').replace(/\/$/, '')
}
