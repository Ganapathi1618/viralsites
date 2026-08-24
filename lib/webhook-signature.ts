import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Standard Webhooks signature verification, which Dodo Payments implements.
 *
 * The signed content is `id.timestamp.body`, HMAC-SHA256 with the secret,
 * base64 encoded. The `webhook-signature` header may carry several
 * space-separated versioned signatures (`v1,<sig> v1,<sig>`) during a secret
 * rotation, so any match counts.
 *
 * The body must be the exact bytes that were signed: parse the JSON only after
 * verifying, never before.
 */
export type SignatureCheck = { ok: true } | { ok: false; reason: string }

const TOLERANCE_SECONDS = 5 * 60

export function verifyWebhookSignature({
  secret,
  id,
  timestamp,
  signature,
  body,
  now = Date.now(),
}: {
  secret: string
  id: string | null
  timestamp: string | null
  signature: string | null
  body: string
  now?: number
}): SignatureCheck {
  if (!id) return { ok: false, reason: 'missing webhook-id header' }
  if (!timestamp) return { ok: false, reason: 'missing webhook-timestamp header' }
  if (!signature) return { ok: false, reason: 'missing webhook-signature header' }

  const sent = Number(timestamp)
  if (!Number.isFinite(sent)) return { ok: false, reason: 'malformed webhook-timestamp' }

  // Reject replays of an old, validly-signed request.
  const skew = Math.abs(now / 1000 - sent)
  if (skew > TOLERANCE_SECONDS) {
    return { ok: false, reason: `timestamp outside tolerance (${Math.round(skew)}s)` }
  }

  // Standard Webhooks secrets are base64 with a `whsec_` prefix.
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
    if (key.length === 0) throw new Error('empty')
  } catch {
    key = Buffer.from(raw, 'utf8')
  }

  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')

  const candidates = signature
    .split(' ')
    .map((part) => (part.includes(',') ? part.slice(part.indexOf(',') + 1) : part))
    .filter(Boolean)

  for (const candidate of candidates) {
    if (safeEqual(candidate, expected)) return { ok: true }
  }

  return { ok: false, reason: 'no signature matched' }
}

/** Constant-time compare that does not leak length through early return. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
