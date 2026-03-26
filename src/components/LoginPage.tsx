'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import { useTheme } from '../context/theme'
import { SunIcon, MoonIcon } from './icons'

type Mode = 'signin' | 'signup' | 'forgot'

export function LoginPage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function reset() {
    setError('')
    setMessage('')
  }

  function switchMode(next: Mode) {
    reset()
    setMode(next)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    reset()
    setLoading(true)
    const supabase = createClient()
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email for a confirmation link.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setMessage('Password reset email sent. Check your inbox.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const isSignin = mode === 'signin'
  const isForgot = mode === 'forgot'

  return (
    <div
      className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-2"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Card shell — matches dashboard gray container */}
      <div className="w-full max-w-sm bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-2">
        {/* Header row */}
        <div className="flex items-center justify-between px-3 pt-3 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-brand flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L6 14v12c0 12 8.4 23.2 18 26 9.6-2.8 18-14 18-26V14L24 4z" fill="white" fillOpacity="0.25"/>
                <polyline points="13,28 18,28 20.5,23 23,33 25.5,19 28,31 30.5,25 33,28 37,28" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              HeartGuard
            </span>
          </div>
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

        {/* Inner white form card */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-5">
          {/* Title */}
          <div className="mb-5">
            <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {isForgot ? 'Reset password' : mode === 'signup' ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
              {isForgot
                ? "We'll send you a reset link"
                : mode === 'signup'
                ? 'Start your journey today'
                : 'Sign in to continue'}
            </p>
          </div>

          {/* Tabs */}
          {!isForgot && (
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-700 rounded-xl p-1 mb-5">
              {(['signin', 'signup'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => switchMode(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border-0 outline-none
                    ${mode === tab
                      ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'bg-transparent text-neutral-400 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                    }`}
                >
                  {tab === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          {message ? (
            <div className="text-center py-4">
              <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
              <button
                onClick={() => { setMessage(''); switchMode('signin') }}
                className="mt-4 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors bg-transparent border-0 cursor-pointer"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-xl border-0 bg-neutral-100 dark:bg-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-500 transition"
                />
              </div>

              {!isForgot && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border-0 bg-neutral-100 dark:bg-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-500 transition"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2 mt-1"
              >
                {loading && (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 dark:border-neutral-900/30 border-t-white dark:border-t-neutral-900 animate-spin" />
                )}
                {isForgot ? 'Send reset email' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>

              {isSignin && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors bg-transparent border-0 cursor-pointer text-center"
                >
                  Forgot password?
                </button>
              )}

              {isForgot && (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors bg-transparent border-0 cursor-pointer text-center"
                >
                  ← Back to sign in
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
