'use client'

import { useState, useCallback, useEffect } from 'react'

type PairingStatus = {
  paired: boolean
  lastSeen?: string
  monitoringMode?: string
  hasPushToken?: boolean
}

export function WatchPairingCard() {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<PairingStatus | null>(null)
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
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

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

      {status?.paired && !success ? (
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
            onClick={() => { setSuccess(false); setStatus({ ...status, paired: false }) }}
            className="text-xs text-neutral-500 dark:text-neutral-400 underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Re-pair watch
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {success ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Watch paired successfully!
            </p>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Open the HeartGuard app on your watch — it will show a 6-digit code. Enter it below.
            </p>
          )}

          {!success && (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
                  placeholder="000000"
                  className="flex-1 text-center font-mono text-lg tracking-[0.3em] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={claimCode}
                  disabled={loading || code.length !== 6}
                  className="rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 text-sm font-medium py-2 px-4 hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? '…' : 'Pair'}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
