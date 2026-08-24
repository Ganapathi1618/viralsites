import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://viralsites.fyi'),
  title: {
    default: 'ViralSites.fyi — viral one-page money sites, ranked',
    template: '%s · ViralSites.fyi',
  },
  description:
    'A directory of viral one-page money sites: bidding boards, pixel grids, leaderboards and sponsor slots — what they charge for and what they earn.',
  openGraph: {
    title: 'ViralSites.fyi',
    description: 'Viral one-page money sites, ranked by what they earn.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'ViralSites.fyi' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Analytics load only once a website id is configured, so local and preview
  // builds send nothing.
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC || 'https://cloud.umami.is/script.js'

  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-page font-sans text-ink antialiased">
        {children}
        {umamiId ? <Script src={umamiSrc} data-website-id={umamiId} strategy="afterInteractive" /> : null}
      </body>
    </html>
  )
}
