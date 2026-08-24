/**
 * Tests for the daily sponsor rotation.
 *
 *   npx tsx scripts/test-rotation.ts
 *
 * Rotation has no live fixture to check against — it only visibly does
 * anything once two or more slots are actually paid for — so the behaviour is
 * pinned here instead.
 */
import { rotateActiveSlots } from '../lib/data'
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

console.log(failures === 0 ? '\nall rotation checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
