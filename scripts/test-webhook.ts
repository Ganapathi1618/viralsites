/**
 * Tests for Dodo webhook signature verification.
 *
 *   npx tsx scripts/test-webhook.ts
 *
 * This guards the one route where a mistake means anyone on the internet can
 * fill a paid sponsor slot for free, so every rejection path is pinned here.
 */
import { createHmac } from 'node:crypto'
import { verifyWebhookSignature } from '../lib/webhook-signature'

let failures = 0

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`, detail ?? '')
  }
}

const SECRET = 'whsec_' + Buffer.from('a-test-signing-secret').toString('base64')
const BODY = JSON.stringify({ type: 'payment.succeeded', data: { payment_id: 'pay_123' } })
const ID = 'msg_abc123'
const NOW = 1_756_000_000_000
const TS = String(Math.floor(NOW / 1000))

function sign(id: string, timestamp: string, body: string, secret = SECRET): string {
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const key = Buffer.from(raw, 'base64')
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
}

const valid = { secret: SECRET, id: ID, timestamp: TS, body: BODY, now: NOW }

console.log('accepts a genuine signature')
check('plain v1 signature', verifyWebhookSignature({ ...valid, signature: `v1,${sign(ID, TS, BODY)}` }).ok)
check('bare signature without the version prefix', verifyWebhookSignature({ ...valid, signature: sign(ID, TS, BODY) }).ok)
check(
  'one of several space-separated signatures (secret rotation)',
  verifyWebhookSignature({ ...valid, signature: `v1,${sign(ID, TS, 'other')} v1,${sign(ID, TS, BODY)}` }).ok,
)

console.log('rejects forgeries')
const wrongSecret = 'whsec_' + Buffer.from('not-the-secret').toString('base64')
check('a signature made with another secret', !verifyWebhookSignature({ ...valid, signature: `v1,${sign(ID, TS, BODY, wrongSecret)}` }).ok)
check('a tampered body', !verifyWebhookSignature({ ...valid, body: BODY.replace('pay_123', 'pay_evil'), signature: `v1,${sign(ID, TS, BODY)}` }).ok)
check('a swapped message id', !verifyWebhookSignature({ ...valid, id: 'msg_other', signature: `v1,${sign(ID, TS, BODY)}` }).ok)
check('garbage', !verifyWebhookSignature({ ...valid, signature: 'v1,not-a-signature' }).ok)
check('an empty signature', !verifyWebhookSignature({ ...valid, signature: '' }).ok)

console.log('rejects replays')
const old = String(Math.floor(NOW / 1000) - 600)
check(
  'a validly-signed request from ten minutes ago',
  !verifyWebhookSignature({ ...valid, timestamp: old, signature: `v1,${sign(ID, old, BODY)}` }).ok,
)
const soon = String(Math.floor(NOW / 1000) + 120)
check(
  'but tolerates two minutes of clock skew',
  verifyWebhookSignature({ ...valid, timestamp: soon, signature: `v1,${sign(ID, soon, BODY)}` }).ok,
)

console.log('rejects missing headers')
check('no id', !verifyWebhookSignature({ ...valid, id: null, signature: `v1,${sign(ID, TS, BODY)}` }).ok)
check('no timestamp', !verifyWebhookSignature({ ...valid, timestamp: null, signature: `v1,${sign(ID, TS, BODY)}` }).ok)
check('no signature', !verifyWebhookSignature({ ...valid, signature: null }).ok)
check('a non-numeric timestamp', !verifyWebhookSignature({ ...valid, timestamp: 'yesterday', signature: `v1,${sign(ID, TS, BODY)}` }).ok)

console.log('secret formats')
const plain = 'a-raw-utf8-secret-not-base64!!'
check(
  'a secret that is not base64 is used as raw bytes',
  verifyWebhookSignature({
    ...valid,
    secret: plain,
    signature: `v1,${createHmac('sha256', Buffer.from(plain, 'base64')).update(`${ID}.${TS}.${BODY}`).digest('base64')}`,
  }).ok,
)

console.log(failures === 0 ? '\nall webhook checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
