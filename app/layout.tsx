import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://viralsites.fyi'),
  title: {
    default: 'ViralSites.fyi — the directory of viral one-page money sites',
    template: '%s · ViralSites.fyi',
  },
  description:
    'A ranked directory of one-page money sites: what they charge for, what they earn, and how fast they got there.',
  openGraph: {
    title: 'ViralSites.fyi',
    description: 'The directory of viral one-page money sites.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'ViralSites.fyi' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-white antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
