import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HeartGuard',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'HeartGuard',
    images: [{ url: '/icons/512.png', width: 512, height: 512 }],
  },
  icons: {
    icon: '/icons/512.png',
    apple: '/icons/512.png',
  },
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
