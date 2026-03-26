import type { Metadata } from 'next'
import { ThemeProvider } from '@/context/theme'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dashboard',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#171717',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
