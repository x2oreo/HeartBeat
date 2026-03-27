'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'

// ── Helpers ──────────────────────────────────────────────────────────

function getInitials(email: string) {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(email: string) {
  const hues = [210, 160, 280, 30, 190, 340, 60]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return hues[Math.abs(hash) % hues.length]
}

// ── Nav items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href: '/chat',
    label: 'AI Assistant',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6.5L8 2l6 4.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
        <path d="M6 14V9h4v5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/scan',
    label: 'Scan Medication',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/medications',
    label: 'My Medications',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 12h6m-3-3v6M19.5 12A7.5 7.5 0 114.5 12a7.5 7.5 0 0115 0z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'Scan History',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/emergency-card',
    label: 'Emergency Card',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/doctor-prep',
    label: 'Doctor Prep',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

const BOTTOM_NAV = {
  href: '/settings',
  label: 'Settings',
  icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

// ── Component ────────────────────────────────────────────────────────

type Props = {
  email: string
  children: React.ReactNode
}

export function DashboardLayout({ email, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const initials = getInitials(email)
  const hue = getAvatarColor(email)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-surface p-2"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="flex flex-1 bg-white rounded-2xl overflow-hidden card-shadow">

        {/* Sidebar */}
        <aside className="w-52 shrink-0 flex flex-col bg-surface-raised border-r border-separator-light">

          {/* Logo */}
          <div className="h-14 flex items-center px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-brand flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4L6 14v12c0 12 8.4 23.2 18 26 9.6-2.8 18-14 18-26V14L24 4z" fill="white" fillOpacity="0.25"/>
                  <polyline points="13,28 18,28 20.5,23 23,33 25.5,19 28,31 30.5,25 33,28 37,28" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-text-primary tracking-tight">
                HeartGuard
              </span>
            </div>
          </div>

          {/* Main nav */}
          <nav className="flex-1 px-2 py-1 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-brand-light text-text-primary shadow-xs'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
              >
                <span className={isActive(item.href) ? 'text-brand' : 'text-text-tertiary'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Bottom nav: settings */}
          <div className="px-2 pb-3 space-y-0.5">
            <Link
              href={BOTTOM_NAV.href}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive(BOTTOM_NAV.href)
                  ? 'bg-brand-light text-text-primary shadow-xs'
                  : 'text-text-secondary hover:bg-surface hover:text-text-primary'
              }`}
            >
              <span className={isActive(BOTTOM_NAV.href) ? 'text-brand' : 'text-text-tertiary'}>
                {BOTTOM_NAV.icon}
              </span>
              {BOTTOM_NAV.label}
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Topbar */}
          <header className="h-14 shrink-0 flex items-center justify-end px-4 border-b border-separator-light">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white select-none cursor-pointer border-0 ring-2 ring-transparent hover:ring-separator transition-all"
                style={{ background: `hsl(${hue} 60% 45%)` }}
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-9 w-52 bg-surface-raised rounded-xl shadow-lg border border-separator-light py-1 z-50">
                  <div className="px-3 py-2.5 border-b border-separator-light">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {email.split('@')[0]}
                    </p>
                    <p className="text-[11px] text-text-tertiary truncate mt-0.5">
                      {email}
                    </p>
                  </div>
                  <button
                    onClick={async () => { await createClient().auth.signOut(); router.push('/login') }}
                    className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors cursor-pointer bg-transparent border-0"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto bg-surface">
            {children}
          </main>
        </div>

      </div>
    </div>
  )
}
