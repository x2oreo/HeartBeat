'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type PairingStatus = {
  paired: boolean
  lastSeen?: string
  monitoringMode?: string
  hasPushToken?: boolean
}

export function WatchPairingFlow() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [, setStatus] = useState<PairingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/watch/pair')
      if (res.ok) setStatus(await res.json() as PairingStatus)
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const claimCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code shown on your watch')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/watch/pair/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to pair')
        return
      }
      setSuccess(true)
      setCode('')
      await fetchStatus()
      setTimeout(() => router.refresh(), 1200)
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      {/* Watch illustration */}
      <div className="flex flex-col items-center mb-8 animate-fade-in-up">
        <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center mb-5 shadow-[0_4px_24px_rgba(52,120,246,0.3)]">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {/* Watch band top */}
            <path d="M14 7V2M26 7V2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            {/* Watch band bottom */}
            <path d="M14 33v5M26 33v5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            {/* Squircle watch body */}
            <rect x="8" y="7" width="24" height="26" rx="7" stroke="white" strokeWidth="2" fill="none" />
            {/* Digital crown */}
            <rect x="32" y="16" width="3" height="8" rx="1.5" fill="white" opacity="0.7" />
            {/* Heart icon */}
            <path
              d="M20 26s-6-3.8-6-7.2c0-2 1.5-3.3 3.3-3.3 1.1 0 2 .5 2.7 1.3.7-.8 1.6-1.3 2.7-1.3 1.8 0 3.3 1.3 3.3 3.3 0 3.4-6 7.2-6 7.2z"
              fill="white"
              opacity="0.9"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Connect Your Apple Watch</h1>
        <p className="text-sm text-text-secondary mt-1.5 text-center max-w-xs">
          Monitor heart rate, HRV, and QT risk in real-time directly from your wrist
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {/* Step 1 */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-brand">1</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Install QTShield on Apple Watch</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Open the App Store on your Apple Watch or use the Watch app on your iPhone. Search for &quot;QTShield&quot; and install it.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2 — Open app on watch */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-brand">2</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Open QTShield on Your Watch</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Launch the QTShield app on your Apple Watch. It will display a 6-digit pairing code on the screen.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 — Enter code */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <div className="flex gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              success ? 'bg-brand text-white' : 'bg-brand-light'
            }`}>
              <span className={`text-sm font-bold ${success ? 'text-white' : 'text-brand'}`}>3</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Enter the Code Below</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Type the 6-digit code from your Apple Watch to pair it with your account.
              </p>

              {success ? (
                <div className="mt-4 bg-risk-safe-bg rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-risk-safe/20 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-risk-safe" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-risk-safe-text">Watch Paired Successfully</p>
                  <p className="text-xs text-risk-safe-text/70 mt-1">Loading your dashboard...</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
                    placeholder="000000"
                    className="w-full text-center font-mono text-lg tracking-[0.3em] rounded-xl border-[1.5px] border-separator bg-surface text-text-primary px-3 py-3 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
                  />
                  <button
                    onClick={claimCode}
                    disabled={loading || code.length !== 6}
                    className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover active:scale-[0.98] disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Pairing…' : 'Pair Watch'}
                  </button>
                  {error && (
                    <p className="text-xs text-risk-danger-text">{error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help text */}
      <p className="text-[11px] text-text-tertiary text-center mt-6 mb-4 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
        Having trouble? Make sure Bluetooth is enabled and your Apple Watch is running watchOS 10 or later.
      </p>
    </div>
  )
}
