'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { MobileMoreSheet } from './MobileMoreSheet'

// ── Bottom nav tabs ─────────────────────────────────────────────────

const TABS = [
  {
    href: '/',
    label: 'Home',
    match: (p: string) => p === '/',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}>
        <path
          d="M3 9.5L12 3l9 6.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.15 : 0}
        />
        <path d="M9 21V14h6v7" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/scan',
    label: 'Scan',
    match: (p: string) => p.startsWith('/scan'),
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          stroke="currentColor"
          strokeWidth={active ? 2.25 : 1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    prominent: true,
  },
  {
    href: '/chat',
    label: 'AI Chat',
    match: (p: string) => p.startsWith('/chat'),
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.1 : 0}
        />
      </svg>
    ),
  },
]

// ── More tab routes (shown in the sheet) ────────────────────────────

const MORE_ROUTES = ['/medications', '/history', '/emergency-card', '/doctor-prep', '/settings']

// ── Component ───────────────────────────────────────────────────────

export function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_ROUTES.some((r) =>
    r === '/settings' ? pathname.startsWith('/settings') : pathname.startsWith(r)
  )

  return (
    <>
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* Spacer to prevent content from hiding behind the fixed nav */}
      <div className="h-[calc(64px+env(safe-area-inset-bottom,0px))] shrink-0 md:hidden" />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Frosted glass bar */}
        <div
          className="border-t border-separator-light bg-white/80 backdrop-blur-xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-stretch justify-around px-2 h-16">
            {TABS.map((tab) => {
              const active = tab.match(pathname)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] px-1 transition-colors ${
                    tab.prominent
                      ? active
                        ? 'text-brand'
                        : 'text-brand/70'
                      : active
                        ? 'text-brand'
                        : 'text-text-tertiary'
                  }`}
                >
                  <span className={`flex items-center justify-center w-11 h-7 rounded-full transition-colors ${
                    active ? 'bg-brand-light' : ''
                  }`}>
                    {tab.icon(active)}
                  </span>
                  <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                </Link>
              )
            })}

            {/* More button */}
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] px-1 transition-colors ${
                moreOpen || isMoreActive ? 'text-brand' : 'text-text-tertiary'
              }`}
            >
              <span className={`flex items-center justify-center w-11 h-7 rounded-full transition-colors ${
                moreOpen || isMoreActive ? 'bg-brand-light' : ''
              }`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                </svg>
              </span>
              <span className={`text-[10px] leading-tight ${moreOpen || isMoreActive ? 'font-semibold' : 'font-medium'}`}>
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
