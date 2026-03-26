'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase/client'
import { useTheme } from '../context/theme'
import { HomeIcon, SunIcon, MoonIcon, BellIcon, GlobeIcon } from './icons'

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

interface Props {
  user: User
  children: React.ReactNode
}

export function DashboardLayout({ user, children }: Props) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const initials = getInitials(user.email ?? 'U')
  const hue = getAvatarColor(user.email ?? '')
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

  return (
    // White page background — barely visible, peeks through at edges
    <div
      className="flex h-screen overflow-hidden bg-white dark:bg-neutral-950 p-2"
      style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif" }}
    >
      {/* App shell — single unified gray container */}
      <div className="flex flex-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl overflow-hidden">

      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900">
              <GlobeIcon />
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Dashboard
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium
              bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
              shadow-xs cursor-pointer border-0 outline-none text-left transition-colors"
          >
            <span className="text-neutral-400 dark:text-neutral-400">
              <HomeIcon />
            </span>
            Home
          </button>
        </nav>

        {/* Bottom */}
        <div className="p-3 flex items-center gap-2">
          <button
            onClick={toggle}
            title="Toggle theme"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 dark:text-neutral-500
              hover:bg-white dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300
              transition-colors cursor-pointer bg-transparent border-0"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center justify-end px-4">
          <div className="flex items-center gap-2">
            {/* Bell */}
            <button
              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 dark:text-neutral-500
                hover:bg-white dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300
                transition-colors cursor-pointer bg-transparent border-0 relative"
            >
              <BellIcon />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white select-none cursor-pointer border-0 ring-2 ring-transparent hover:ring-neutral-300 dark:hover:ring-neutral-600 transition-all"
                style={{ background: `hsl(${hue} 60% 45%)` }}
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-9 w-52 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-100 dark:border-neutral-700 py-1 z-50">
                  <div className="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {user.email?.split('@')[0]}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={async () => { await createClient().auth.signOut(); router.push('/login') }}
                    className="w-full text-left px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer bg-transparent border-0"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content — slightly lighter inner area */}
        <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950 mx-2 mb-2 rounded-xl p-5">
          {children}
        </main>
      </div>

      </div> {/* end app shell */}
    </div>
  )
}
