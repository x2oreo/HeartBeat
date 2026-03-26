'use client'

import { useState, useCallback } from 'react'

type PairingStatus = {
  paired: boolean
  lastSeen?: string
  monitoringMode?: string
  hasPushToken?: boolean
}

export function WatchPairingCard() {
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState<number>(0)
  const [status, setStatus] = useState<PairingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/watch/pair')
      if (res.ok) {
        const data = await res.json() as PairingStatus
        setStatus(data)
      }
    } catch {
      // Non-critical
    }
  }, [])

  const generateCode = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/watch/pair', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate code')
      const data = await res.json() as { code: string; expiresInSeconds: number }
      setPairingCode(data.code)
      setExpiresIn(data.expiresInSeconds)

      // Start countdown
      const interval = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setPairingCode(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError('Failed to generate pairing code')
    } finally {
      setLoading(false)
    }
  }

  // Fetch status on mount
  useState(() => {
    fetchStatus()
  })

  const lastSeenText = status?.lastSeen
    ? `Last seen ${new Date(status.lastSeen).toLocaleString()}`
    : null

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Apple Watch
        </h3>
        {status?.paired && (
          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 font-medium">
            Paired
          </span>
        )}
      </div>

      {status?.paired ? (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Your Apple Watch is connected to HeartGuard.
          </p>
          {lastSeenText && (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{lastSeenText}</p>
          )}
          <div className="flex gap-2 text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400">
              Mode: <span className="font-medium text-neutral-700 dark:text-neutral-300">{status.monitoringMode}</span>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              Push: <span className="font-medium text-neutral-700 dark:text-neutral-300">{status.hasPushToken ? 'Enabled' : 'Not set up'}</span>
            </span>
          </div>
          <button
            onClick={generateCode}
            className="text-xs text-neutral-500 dark:text-neutral-400 underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Re-pair watch
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Pair your Apple Watch to see live heart rate, HRV, and risk data on your dashboard.
          </p>

          {pairingCode ? (
            <div className="flex flex-col items-center py-3 space-y-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Enter this code on your Apple Watch:
              </p>
              <div className="text-3xl font-mono font-bold tracking-[0.3em] text-neutral-900 dark:text-neutral-100">
                {pairingCode}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Expires in {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, '0')}
              </p>
            </div>
          ) : (
            <button
              onClick={generateCode}
              disabled={loading}
              className="w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 text-sm font-medium py-2 px-4 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Generating...' : 'Pair Watch'}
            </button>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
