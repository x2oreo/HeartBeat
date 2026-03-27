'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type PairingState = 'idle' | 'generating' | 'waiting' | 'success' | 'error'

export function WatchPairingFlow() {
  const router = useRouter()
  const [state, setState] = useState<PairingState>('idle')
  const [code, setCode] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  useEffect(() => cleanup, [cleanup])

  async function generateCode() {
    setState('generating')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/watch/pair', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate code')
      const data = await res.json() as { code: string; expiresInSeconds: number }

      setCode(data.code)
      setSecondsLeft(data.expiresInSeconds)
      setState('waiting')

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            cleanup()
            setState('idle')
            setCode(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Poll for pairing completion
      pollRef.current = setInterval(async () => {
        try {
          const check = await fetch('/api/watch/pair')
          if (!check.ok) return
          const status = await check.json() as { paired: boolean }
          if (status.paired) {
            cleanup()
            setState('success')
            setTimeout(() => router.refresh(), 1200)
          }
        } catch {
          // Ignore poll errors
        }
      }, 5000)
    } catch {
      setState('error')
      setErrorMsg('Could not generate pairing code. Please try again.')
    }
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div className="px-4 py-12 max-w-md mx-auto">
      {/* Watch illustration */}
      <div className="flex flex-col items-center mb-8 animate-fade-in-up">
        <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center mb-5 shadow-[0_4px_24px_rgba(52,120,246,0.3)]">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {/* Watch body */}
            <rect x="10" y="6" width="20" height="28" rx="6" stroke="white" strokeWidth="2" fill="none" />
            {/* Watch bands */}
            <path d="M14 6V2M26 6V2M14 34v4M26 34v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
            {/* Heartbeat line */}
            <polyline
              points="14,20 17,20 18.5,15 20,25 21.5,13 23,22 24.5,18 26,20"
              stroke="white"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
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
              <p className="text-sm font-semibold text-text-primary">Install HeartGuard on Apple Watch</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Open the App Store on your Apple Watch or use the Watch app on your iPhone. Search for &quot;HeartGuard&quot; and install it.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2 — Code generation */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="flex gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              state === 'waiting' || state === 'success' ? 'bg-brand text-white' : 'bg-brand-light'
            }`}>
              <span className={`text-sm font-bold ${state === 'waiting' || state === 'success' ? 'text-white' : 'text-brand'}`}>2</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Generate Pairing Code</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Generate a one-time code and enter it on your Apple Watch to pair securely.
              </p>

              {state === 'idle' && (
                <button
                  onClick={generateCode}
                  className="mt-3 w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover active:scale-[0.98] transition-all"
                >
                  Generate Code
                </button>
              )}

              {state === 'generating' && (
                <div className="mt-3 flex items-center justify-center py-3">
                  <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
              )}

              {state === 'waiting' && code && (
                <div className="mt-4">
                  {/* Code display */}
                  <div className="bg-surface rounded-xl p-4 text-center">
                    <p className="text-[32px] font-bold font-mono tracking-[0.3em] text-text-primary leading-none">
                      {code.slice(0, 3)}<span className="text-text-tertiary mx-1">-</span>{code.slice(3)}
                    </p>
                    <p className="text-[11px] text-text-tertiary mt-2.5">
                      Expires in {mins}:{secs.toString().padStart(2, '0')}
                    </p>
                  </div>

                  {/* Waiting indicator */}
                  <div className="flex items-center justify-center gap-2 mt-3 py-1">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-text-secondary">Waiting for watch to connect...</span>
                  </div>
                </div>
              )}

              {state === 'success' && (
                <div className="mt-4 bg-risk-safe-bg rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-risk-safe/20 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-risk-safe" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-risk-safe-text">Watch Paired Successfully</p>
                  <p className="text-xs text-risk-safe-text/70 mt-1">Loading your dashboard...</p>
                </div>
              )}

              {state === 'error' && errorMsg && (
                <div className="mt-3">
                  <p className="text-xs text-risk-danger mb-2">{errorMsg}</p>
                  <button
                    onClick={generateCode}
                    className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-brand">3</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Enter Code on Your Watch</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Open HeartGuard on your Apple Watch, tap &quot;Connect to Phone&quot;, and enter the 6-digit code.
                The watch will begin monitoring automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help text */}
      <p className="text-[11px] text-text-tertiary text-center mt-6 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
        Having trouble? Make sure Bluetooth is enabled and your Apple Watch is running watchOS 10 or later.
      </p>
    </div>
  )
}
