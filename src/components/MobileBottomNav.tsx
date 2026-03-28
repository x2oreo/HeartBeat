'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'


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
    href: '/watch',
    label: 'Watch',
    match: (p: string) => p.startsWith('/watch'),
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {/* Watch band top */}
        <path d="M8.5 4.5V1.5M15.5 4.5V1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Watch band bottom */}
        <path d="M8.5 19.5v3M15.5 19.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Squircle watch body */}
        <rect
          x="5.5" y="4.5" width="13" height="15" rx="4"
          stroke="currentColor"
          strokeWidth="1.75"
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.1 : 0}
        />
        {/* Digital crown */}
        <rect x="18.5" y="9.5" width="1.5" height="5" rx="0.75" fill="currentColor" opacity={active ? 1 : 0.5} />
        {/* Heart icon */}
        <path
          d="M12 15.5s-3.5-2.2-3.5-4.2c0-1.2.9-2 2-2 .7 0 1.2.3 1.5.8.3-.5.8-.8 1.5-.8 1.1 0 2 .8 2 2 0 2-3.5 4.2-3.5 4.2z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
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


const SHEET_ITEMS = [
  {
    href: '/medications',
    label: 'My Medications',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 12h6m-3-3v6M19.5 12A7.5 7.5 0 114.5 12a7.5 7.5 0 0115 0z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'Scan History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/emergency-card',
    label: 'Emergency Card',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/doctor-prep',
    label: 'Doctor Prep',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]


const MORE_ROUTES = ['/medications', '/history', '/emergency-card', '/doctor-prep', '/settings']


export function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_ROUTES.some((r) =>
    r === '/settings' ? pathname.startsWith('/settings') : pathname.startsWith(r)
  )

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [moreOpen])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          moreOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMoreOpen(false)}
      />

      {/* Spacer to prevent content from hiding behind the fixed nav */}
      <div className="h-[calc(64px+env(safe-area-inset-bottom,0px))] shrink-0 md:hidden" />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <div
          className={`transition-all duration-300 ease-out ${
            moreOpen
              ? 'bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)]'
              : 'bg-white/80 backdrop-blur-xl border-t border-separator-light'
          }`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Expanded more panel */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              moreOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* Drag indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Sheet items as 2-column grid */}
            <div className="grid grid-cols-2 gap-1 px-3 pb-3">
              {SHEET_ITEMS.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors min-h-[52px] ${
                      active
                        ? 'bg-brand-light text-text-primary'
                        : 'text-text-secondary active:bg-surface hover:bg-surface'
                    }`}
                  >
                    <span className={`shrink-0 ${active ? 'text-brand' : 'text-text-tertiary'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-separator-light" />
          </div>

          {/* Tab bar — always visible */}
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
              <span className={`flex items-center justify-center w-11 h-7 rounded-full transition-all duration-300 ${
                moreOpen || isMoreActive ? 'bg-brand-light' : ''
              }`}>
                {/* Animates between dots (closed) and X (open) */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`transition-transform duration-300 ${moreOpen ? 'rotate-90' : 'rotate-0'}`}
                >
                  {moreOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  ) : (
                    <>
                      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                    </>
                  )}
                </svg>
              </span>
              <span className={`text-[10px] leading-tight ${moreOpen || isMoreActive ? 'font-semibold' : 'font-medium'}`}>
                {moreOpen ? 'Close' : 'More'}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
