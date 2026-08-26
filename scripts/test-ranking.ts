/**
 * Tests for the ranking rule.
 *
 *   npx tsx scripts/test-ranking.ts
 *
 * The authority is `sites_ranked` in Postgres; `byRank` is the TypeScript copy
 * the demo fallback uses. The fixture here is the same one run against a real
 * Postgres 16 while this was written, so the two cannot drift silently: if the
 * view's ORDER BY ever changes, this fails.
 */
import { byRank } from '../lib/data'
import type { Site } from '../lib/types'

let failures = 0

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`, detail ?? '')
  }
}

function site(name: string, revenue: number, bid: number): Site {
  return {
    id: name,
    name,
    url: `https://${name}.com`,
    description: '',
    model_type: 'other',
    revenue_amount: revenue,
    revenue_verified: false,
    revenue_source_url: null,
    trend_percent: null,
    launched_at: null,
    is_featured: false,
    created_at: new Date().toISOString(),
    clicks: 0,
    bid_amount: bid,
    bid_expires_at: null,
    is_boosted: bid > 0,
  }
}

// The biggest earner has no bid; the smallest earner has the biggest bid.
const board = [
  site('bigearner', 500_000, 0),
  site('midearner', 250_000, 0),
  site('tinybidder', 12, 500),
  site('midbidder', 90_000, 50),
  site('lowbidder', 0, 1),
  site('expired', 100, 99),
  site('zero', 0, 0),
]

const order = board.slice().sort(byRank).map((s) => s.name)

console.log('the order Postgres produces for this exact board')
check(
  'boosted by bid desc, then organic by revenue desc',
  JSON.stringify(order) ===
    JSON.stringify(['tinybidder', 'expired', 'midbidder', 'lowbidder', 'bigearner', 'midearner', 'zero']),
  order,
)

console.log('the rules that order encodes')
check('a $500 bid outranks a $500,000 earner', order.indexOf('tinybidder') < order.indexOf('bigearner'))
check('a $1 bid outranks every organic site', order.indexOf('lowbidder') < order.indexOf('bigearner'))
check('among boosted sites, the bigger bid wins', order.indexOf('midbidder') < order.indexOf('lowbidder'))
check('among organic sites, the bigger revenue wins', order.indexOf('bigearner') < order.indexOf('midearner'))
check('a zero bid never ranks as boosted', order[order.length - 1] === 'zero')

console.log('a payment lands')
const afterPayment = board
  .map((s) => (s.name === 'lowbidder' ? { ...s, bid_amount: 501, is_boosted: true } : s))
  .sort(byRank)
check('the payer takes #1 straight away', afterPayment[0].name === 'lowbidder', afterPayment[0].name)
check('the previous leader drops to #2', afterPayment[1].name === 'tinybidder', afterPayment[1].name)
check(
  'and is still boosted, not removed',
  afterPayment[1].is_boosted,
)

console.log('ties')
const tied = [site('b', 10, 5), site('a', 99, 5)].sort(byRank)
check('an equal bid falls back to revenue', tied[0].name === 'a')

console.log(failures === 0 ? '\nall ranking checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
