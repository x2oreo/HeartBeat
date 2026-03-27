'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

type Mode = 'signin' | 'signup' | 'forgot'

export function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        })
        if (error) throw error
        router.push('/')
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
      className="min-h-screen bg-surface flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Card shell */}
      <div className="w-full max-w-sm bg-surface-raised rounded-2xl card-shadow p-6">
        {/* Header row */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L6 14v12c0 12 8.4 23.2 18 26 9.6-2.8 18-14 18-26V14L24 4z" fill="white" fillOpacity="0.25"/>
              <polyline points="13,28 18,28 20.5,23 23,33 25.5,19 28,31 30.5,25 33,28 37,28" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base font-bold text-text-primary tracking-tight">
            QTShield
          </span>
        </div>

        {/* Title */}
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-text-primary">
            {isForgot ? 'Reset password' : mode === 'signup' ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {isForgot
              ? "We'll send you a reset link"
              : mode === 'signup'
              ? 'Start your journey today'
              : 'Sign in to continue'}
          </p>
        </div>

        {/* Tabs */}
        {!isForgot && (
          <div className="flex gap-1 bg-surface rounded-xl p-1 mb-5">
            {(['signin', 'signup'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => switchMode(tab)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border-0 outline-none
                  ${mode === tab
                    ? 'bg-surface-raised text-text-primary shadow-xs'
                    : 'bg-transparent text-text-tertiary hover:text-text-secondary'
                  }`}
              >
                {tab === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

        {message ? (
          <div className="text-center py-4">
            <p className="text-sm text-risk-safe-text">{message}</p>
            <button
              onClick={() => { setMessage(''); switchMode('signin') }}
              className="mt-4 text-xs text-text-tertiary hover:text-text-secondary transition-colors bg-transparent border-0 cursor-pointer"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">
                    First name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-text-secondary">
                    Last name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition"
              />
            </div>

            {!isForgot && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-risk-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand text-white text-[15px] font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2 mt-1 shadow-[0_4px_16px_rgba(52,120,246,0.2)]"
            >
              {loading && (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {isForgot ? 'Send reset email' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>

            {isSignin && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors bg-transparent border-0 cursor-pointer text-center"
              >
                Forgot password?
              </button>
            )}

            {isForgot && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors bg-transparent border-0 cursor-pointer text-center"
              >
                ← Back to sign in
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
