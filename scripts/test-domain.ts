/**
 * Tests for domain normalisation.
 *
 *   npx tsx scripts/test-domain.ts
 *
 * This is the single comparison that decides whether a paid bid finds its
 * site. It runs in three places — the checkout route, the Dodo webhook and
 * `normalize_domain()` in Postgres — and every one of them has to agree, so
 * the cases that used to produce "that site is not listed" are pinned here.
 */
import { normalizeDomain } from '../lib/domain'

let failures = 0

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

console.log('every way a bidder might type the same site')
for (const typed of [
  'outbid.lol',
  'Outbid.LOL',
  '  outbid.lol  ',
  'www.outbid.lol',
  'http://outbid.lol',
  'https://outbid.lol',
  'https://outbid.lol/',
  'https://www.outbid.lol/',
  'https://WWW.Outbid.lol/pricing?ref=x#top',
  'https://outbid.lol:3000/',
]) {
  check(typed, normalizeDomain(typed), 'outbid.lol')
}

console.log('sites that must stay distinct')
check('a subdomain is its own site', normalizeDomain('https://app.outbid.lol'), 'app.outbid.lol')
check('a suffix match is not a match', normalizeDomain('https://notoutbid.lol'), 'notoutbid.lol')
check('a different tld', normalizeDomain('https://outbid.fyi'), 'outbid.fyi')

console.log('nothing usable')
check('empty', normalizeDomain(''), '')
check('null', normalizeDomain(null), '')
check('undefined', normalizeDomain(undefined), '')
check('a bare scheme', normalizeDomain('https://'), '')
check('only a path', normalizeDomain('/submit'), '')

console.log(failures === 0 ? '\nall domain checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
