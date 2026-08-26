/**
 * Tests for the Datafast response reader.
 *
 *   npx tsx scripts/test-datafast.ts
 *
 * The two endpoints are confirmed; their field names are not, and datafa.st
 * is unreachable from the environment this was written in. So the reader
 * matches a set of plausible names anywhere in the payload. That leniency is
 * the risk: these pin the two ways it could go wrong — reading a per-day
 * figure as the window total, and inventing a number where the payload has
 * none.
 */
import { pickNumber, reportingRange, statsUrls } from '../lib/datafast'

let failures = 0

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

const VISITORS = ['uniquevisitors', 'unique_visitors', 'visitors']
const PAGEVIEWS = ['totalpageviews', 'pageviews', 'views']

console.log('finds a figure whatever the shape')
check('flat', pickNumber({ visitors: 1234 }, VISITORS), 1234)
check('under data', pickNumber({ data: { visitors: 99 } }, VISITORS), 99)
check('camelCase', pickNumber({ uniqueVisitors: 42 }, VISITORS), 42)
check('snake_case', pickNumber({ unique_visitors: 42 }, VISITORS), 42)
check('a numeric string', pickNumber({ visitors: '2,430' }, VISITORS), 2430)
check('inside an array', pickNumber({ results: [{ pageviews: 7 }] }, PAGEVIEWS), 7)

console.log('prefers the total over a daily breakdown')
check(
  'top-level total wins over the first day',
  pickNumber(
    { visitors: 5000, series: [{ date: '2026-08-01', visitors: 12 }] },
    VISITORS,
  ),
  5000,
)
check(
  'a total nested one level still wins over a deeper series',
  pickNumber(
    { data: { visitors: 800, byDay: [{ day: 1, visitors: 3 }] } },
    VISITORS,
  ),
  800,
)

console.log('never invents a number')
check('an absent key', pickNumber({ sessions: 5 }, VISITORS), null)
check('a null value', pickNumber({ visitors: null }, VISITORS), null)
check('a non-numeric string', pickNumber({ visitors: 'lots' }, VISITORS), null)
check('an empty string', pickNumber({ visitors: '' }, VISITORS), null)
check('an empty payload', pickNumber({}, VISITORS), null)
check('not an object', pickNumber('nope', VISITORS), null)
check('zero is a real answer', pickNumber({ visitors: 0 }, VISITORS), 0)

console.log('the reporting window')
const range = reportingRange(new Date('2026-08-26T07:13:00Z'))
check('ends today', range.endAt, '2026-08-26')
check('starts thirty days back', range.startAt, '2026-07-27')

console.log('the two URLs it calls')
const urls = statsUrls(new Date('2026-08-26T07:13:00Z'))
check(
  'realtime',
  urls.realtime,
  'https://datafa.st/api/v1/analytics/realtime?websiteId=dfid_vGpUzorjuNOwlhQikL4ui',
)
check(
  'overview, with a rolling 30-day window',
  urls.overview,
  'https://datafa.st/api/v1/analytics/overview?startAt=2026-07-27&endAt=2026-08-26&websiteId=dfid_vGpUzorjuNOwlhQikL4ui',
)

// A fixed range would keep reporting the same month forever.
const later = statsUrls(new Date('2026-12-25T00:00:00Z'))
check('the window moves with the calendar', later.overview.includes('endAt=2026-12-25'), true)

console.log(failures === 0 ? '\nall Datafast checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
