import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { umamiScriptSrc, umamiWebsiteId } from '@/lib/analytics'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

const TITLE = 'ViralSites.fyi — Viral one-page money sites, ranked'
const DESCRIPTION =
  'Tracking every viral one-page money site. Revenue, model type, launch date — all in one place.'

/**
 * Base for absolute URLs in metadata. X and Slack reject a relative og:image,
 * so this has to resolve to something a crawler can actually reach — a
 * NEXT_PUBLIC_SITE_URL still pointing at localhost would publish a dead image
 * URL on every share, so local values are ignored outside development.
 */
function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const isLocal = configured ? /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(configured) : false

  if (configured && !(isLocal && process.env.NODE_ENV === 'production')) return configured
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'https://viralsites.fyi'
}

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: TITLE, template: '%s · ViralSites.fyi' },
  description: DESCRIPTION,
  applicationName: 'ViralSites.fyi',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon.png', type: 'image/png', sizes: '256x256' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: 'ViralSites.fyi',
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script defer src={umamiScriptSrc()} data-website-id={umamiWebsiteId()} />
      </head>
      <body className="bg-page font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
