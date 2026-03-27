import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HeartGuard',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#F2F2F7',
  viewportFit: 'cover' as const,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
