/**
 * Manual scrape, same code path as the cron route.
 *
 *   npx tsx scripts/scrape.ts
 *
 * Without Supabase credentials it parses the sources and prints what it found
 * instead of writing anything.
 */
import { syncFromSources } from '../lib/scraper/sync'

syncFromSources()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2))
    if (!result.ok) process.exitCode = 1
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
