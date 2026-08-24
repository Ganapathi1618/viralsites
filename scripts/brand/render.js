/**
 * Renders the favicon and Open Graph card from the HTML beside this file.
 *
 *   node scripts/brand/render.js
 *
 * Chromium does the drawing so the assets use the same colours and type as the
 * site, and changing them means editing CSS rather than plotting pixels.
 * Run scripts/brand/pack-ico.js afterwards to rebuild public/favicon.ico.
 */
const fs = require('fs')
const path = require('path')

const HERE = __dirname
const ROOT = path.resolve(HERE, '..', '..')
const OUT = path.join(HERE, 'out')

/** Playwright's bundled Chromium, wherever the environment put it. */
function findChromium() {
  const bases = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)

  for (const base of bases) {
    let entries = []
    try {
      entries = fs.readdirSync(base)
    } catch {
      continue
    }

    for (const entry of entries) {
      for (const candidate of [
        path.join(base, entry, 'chrome-linux', 'chrome'),
        path.join(base, entry, 'chrome-linux', 'headless_shell'),
      ]) {
        try {
          if (fs.statSync(candidate).isFile()) return candidate
        } catch {
          // Keep looking.
        }
      }
    }
  }

  return undefined // Let Playwright fall back to its own resolution.
}

async function main() {
  const { chromium } = require('playwright-core')
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ['--no-sandbox'],
  })

  // The icon is drawn once at 512 and scaled down, so every size is identical.
  for (const size of [512, 256, 180, 48, 32, 16]) {
    const page = await browser.newPage({
      viewport: { width: 512, height: 512 },
      deviceScaleFactor: size / 512,
    })
    await page.goto(`file://${path.join(HERE, 'icon.html')}`, { waitUntil: 'load' })
    await page.screenshot({ path: path.join(OUT, `icon-${size}.png`), omitBackground: true })
    await page.close()
  }

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await og.goto(`file://${path.join(HERE, 'og.html')}`, { waitUntil: 'load' })
  await og.screenshot({ path: path.join(OUT, 'og.png') })
  await og.close()

  await browser.close()

  const copies = [
    ['icon-256.png', 'app/icon.png'],
    ['icon-180.png', 'app/apple-icon.png'],
    ['icon-512.png', 'public/favicon.png'],
    ['og.png', 'public/og.png'],
  ]

  for (const [from, to] of copies) {
    fs.copyFileSync(path.join(OUT, from), path.join(ROOT, to))
    console.log('wrote', to)
  }

  console.log('\nnow run: node scripts/brand/pack-ico.js')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
