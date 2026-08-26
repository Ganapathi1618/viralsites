/**
 * The bare domain of a URL: lowercased, no scheme, no `www.`, no port, no
 * path, no trailing slash.
 *
 * Bidders type their site a dozen ways — "outbid.lol", "https://Outbid.lol",
 * "www.outbid.lol/" — and every one of them has to find the same row. This
 * mirrors the `normalize_domain()` function in the database, so a
 * match made in JavaScript and a match made in Postgres agree — with a port
 * stripped here as well, which the database never sees because listed URLs
 * never carry one.
 */
export function normalizeDomain(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
}
