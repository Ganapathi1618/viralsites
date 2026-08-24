/**
 * Fixture tests for the outbid.lol parser.
 *
 *   npx tsx scripts/test-scraper.ts
 *
 * The live source cannot be part of a test run (its markup changes and CI has
 * no network), so each parsing strategy gets a fixture that mimics the shape it
 * targets. If a real page stops matching all three, the cron route reports
 * `scraped: 0` rather than failing silently.
 */
import { guessModelType, parseAmount, parseListings } from '../lib/scraper/outbid'

let failures = 0

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    failures += 1
    console.error(`  FAIL ${name}`, detail === undefined ? '' : detail)
  }
}

// --- Strategy 1: Next.js __NEXT_DATA__ -------------------------------------
const nextDataHtml = `<!doctype html><html><body>
<script id="__NEXT_DATA__" type="application/json">
${JSON.stringify({
  props: {
    pageProps: {
      listings: [
        { name: 'Outbid', url: 'https://outbid.lol', revenue: 184320, description: 'Highest bid takes the top slot.' },
        { name: 'PixelWall', url: 'https://pixelwall.example', revenue: '18.75k', description: 'A grid of pixels.' },
      ],
    },
  },
})}
</script></body></html>`

console.log('__NEXT_DATA__')
const fromNextData = parseListings(nextDataHtml, 'https://outbid.lol')
check('parses both listings', fromNextData.length === 2, fromNextData)
check('reads revenue', fromNextData[0]?.revenue === 184320, fromNextData[0])
check('expands the k suffix', fromNextData.some((l) => l.revenue === 18750), fromNextData)
check('classifies pixel', fromNextData.find((l) => l.name === 'PixelWall')?.model_type === 'pixel')

// --- Strategy 2: JSON-LD ----------------------------------------------------
const jsonLdHtml = `<!doctype html><html><head>
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: [
    { '@type': 'Product', name: 'ShipBoard', url: 'https://shipboard.example', description: 'Leaderboard of makers.', price: '$61,250' },
  ],
})}
</script></head><body></body></html>`

console.log('JSON-LD')
const fromJsonLd = parseListings(jsonLdHtml, 'https://outbid.lol')
check('parses the item', fromJsonLd.length === 1, fromJsonLd)
check('reads a $-formatted price', fromJsonLd[0]?.revenue === 61250, fromJsonLd[0])
check('classifies leaderboard', fromJsonLd[0]?.model_type === 'leaderboard', fromJsonLd[0])

// --- Strategy 3: plain markup ----------------------------------------------
const anchorHtml = `<!doctype html><html><body><ul>
  <li><a href="https://sponsorrow.example">SponsorRow</a> <span>one sponsor per row</span> <b>$44,800</b></li>
  <li><a href="https://dotgrid.example">DotGrid</a> <span>a dot costs a dollar</span> <b>$2.1k</b></li>
  <li><a href="https://twitter.com/someone">Twitter</a> <b>$999</b></li>
</ul></body></html>`

console.log('plain markup')
const fromAnchors = parseListings(anchorHtml, 'https://outbid.lol')
check('parses both rows', fromAnchors.length === 2, fromAnchors)
check('skips social links', !fromAnchors.some((l) => l.url.includes('twitter.com')), fromAnchors)
check('reads the amount', fromAnchors[0]?.revenue === 44800, fromAnchors[0])
check('expands 2.1k', fromAnchors.some((l) => l.revenue === 2100), fromAnchors)

// --- Degradation ------------------------------------------------------------
console.log('unparseable input')
check('returns nothing rather than junk', parseListings('<html><body>hi</body></html>').length === 0)

// --- Units ------------------------------------------------------------------
console.log('helpers')
check('parseAmount plain', parseAmount('$1,234') === 1234)
check('parseAmount M suffix', parseAmount('$1.2M') === 1_200_000)
check('parseAmount no match', parseAmount('nothing here') === null)
check('guessModelType sponsor', guessModelType('weekly sponsor placement') === 'sponsor')
check('guessModelType default', guessModelType('mystery box') === 'bid')

console.log(failures === 0 ? '\nall scraper checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
