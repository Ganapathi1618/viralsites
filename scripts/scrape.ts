/**
 * Manual scrape, same code path as the cron route.
 *
 *   npx tsx scripts/scrape.ts
 *
 * Reads .env.local for Supabase credentials; without them it parses the source
 * and prints what it found instead of writing.
 */
import { syncFromSource } from '../lib/scraper/sync'

async function main() {
  const result = await syncFromSource()
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
