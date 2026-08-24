/**
 * Tests for the daily sponsor rotation.
 *
 *   npx tsx scripts/test-rotation.ts
 *
 * Rotation has no live fixture to check against — it only visibly does
 * anything once two or more slots are actually paid for — so the behaviour is
 * pinned here instead.
 */
import { fillSlots, rotateActiveSlots } from '../lib/data'
import type { AdSlot } from '../lib/types'

let failures = 0

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`, detail ?? '')
  }
}

function slot(position: number, name: string | null): AdSlot {
  return {
    id: `slot-${position}`,
    position,
    company_name: name,
    company_url: name ? `https://${name}` : null,
    one_liner: name,
    is_active: Boolean(name),
  }
}

const DAY = 86_400_000
const names = (slots: AdSlot[]) => slots.map((s) => s.company_name ?? '·').join(',')

// Three paid slots in a rail of six.
const mixed = [slot(1, 'a'), slot(2, 'b'), slot(3, null), slot(4, 'c'), slot(5, null), slot(6, null)]

console.log('rotation')
const day0 = rotateActiveSlots(mixed, 0)
const day1 = rotateActiveSlots(mixed, DAY)
const day2 = rotateActiveSlots(mixed, 2 * DAY)
const day3 = rotateActiveSlots(mixed, 3 * DAY)

check('day 0 order', names(day0) === 'a,b,·,c,·,·', names(day0))
check('day 1 shifts by one', names(day1) === 'b,c,·,a,·,·', names(day1))
check('day 2 shifts again', names(day2) === 'c,a,·,b,·,·', names(day2))
check('day 3 returns to the start', names(day3) === names(day0), names(day3))

check(
  'every sponsor reaches the top slot within one cycle',
  new Set([day0, day1, day2].map((slots) => slots[0].company_name)).size === 3,
)

console.log('stability')
check(
  'open slots never move',
  [day0, day1, day2].every((slots) => !slots[2].is_active && !slots[4].is_active && !slots[5].is_active),
)
check(
  'the same day always produces the same order',
  names(rotateActiveSlots(mixed, DAY + 3600_000)) === names(day1),
)

console.log('edge cases')
check('a single sponsor is left alone', names(rotateActiveSlots([slot(1, 'a'), slot(2, null)], 9 * DAY)) === 'a,·')
check('all-open rails are untouched', names(rotateActiveSlots([slot(1, null), slot(2, null)], DAY)) === '·,·')
check('an empty list is fine', rotateActiveSlots([], DAY).length === 0)

// --- who counts as a sponsor ------------------------------------------------
console.log('sponsor eligibility')

const paid = fillSlots([
  { id: 'a', position: 1, company_name: 'paid.co', company_url: 'https://paid.co', one_liner: 'real', is_active: true, stripe_subscription_id: 'sub_123' },
])
check('a slot with a subscription shows as sold', paid[0].is_active && paid[0].company_name === 'paid.co')

const seeded = fillSlots([
  { id: 'b', position: 1, company_name: 'seeded.co', company_url: 'https://seeded.co', one_liner: 'placeholder', is_active: true, stripe_subscription_id: null },
])
check('an active slot with no subscription is treated as open', !seeded[0].is_active, seeded[0])
check('its details are withheld, not just hidden', seeded[0].company_name === null && seeded[0].company_url === null, seeded[0])

const manual = fillSlots([
  { id: 'c', position: 1, company_name: 'comped.co', company_url: 'https://comped.co', one_liner: 'comped', is_active: true, stripe_subscription_id: 'manual' },
])
check("'manual' places a comped sponsor", manual[0].is_active && manual[0].company_name === 'comped.co')

const cancelled = fillSlots([
  { id: 'd', position: 1, company_name: 'gone.co', company_url: 'https://gone.co', one_liner: 'lapsed', is_active: false, stripe_subscription_id: 'sub_456' },
])
check('a cancelled slot is open again', !cancelled[0].is_active, cancelled[0])

check('missing rows become open placeholders', fillSlots([]).length === 6 && fillSlots([]).every((s) => !s.is_active))
check('the subscription id never leaves the server', !('stripe_subscription_id' in paid[0]))

console.log(failures === 0 ? '\nall rotation checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
