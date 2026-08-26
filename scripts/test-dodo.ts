/**
 * Tests for reading Dodo's payment response.
 *
 *   npx tsx scripts/test-dodo.ts
 *
 * This one function decides whether a bidder reaches a payment page or a dead
 * end, and it cannot be exercised against the live API from here — so the
 * shape Dodo actually returns is pinned as a fixture.
 */
import { describeKeys, firstUrl } from '../lib/dodo'

let failures = 0

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const LINK = 'https://checkout.dodopayments.com/QgxeGs2o'

console.log('the response Dodo actually returns')
check('payment_link', firstUrl({ payment_link: LINK }), LINK)
check(
  'payment_link alongside the other fields it sends',
  firstUrl({ payment_id: 'pay_123', payment_link: LINK, total_amount: 100 }),
  LINK,
)

console.log('fallbacks, in order')
check('url', firstUrl({ url: LINK }), LINK)
check('checkout_url', firstUrl({ checkout_url: LINK }), LINK)
check('payment_url', firstUrl({ payment_url: LINK }), LINK)
check('session_url', firstUrl({ session_url: LINK }), LINK)
check('inside a data envelope', firstUrl({ data: { payment_link: LINK } }), LINK)
check(
  'payment_link wins over a fallback in the same response',
  firstUrl({ payment_link: LINK, url: 'https://example.com/wrong' }),
  LINK,
)

console.log('never returns something that is not a link')
// The request body sends payment_link: true. Echoing that back would redirect
// a paying bidder to the string "true".
check('the boolean from the request body', firstUrl({ payment_link: true }), null)
check('a non-URL string', firstUrl({ payment_link: 'pending' }), null)
check('a relative path', firstUrl({ payment_link: '/checkout/abc' }), null)
check('an empty response', firstUrl({}), null)
check('null', firstUrl(null), null)
check('an error response', firstUrl({ error: 'product not found' }), null)

console.log('the key log line')
check('top level', describeKeys({ payment_link: LINK, payment_id: 'p_1' }), 'payment_link, payment_id')
check(
  'names the nested keys too',
  describeKeys({ status: 'ok', data: { payment_link: LINK } }),
  'status, data (data: payment_link)',
)
check('an empty response still logs something', describeKeys({}), '')

console.log(failures === 0 ? '\nall Dodo checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
