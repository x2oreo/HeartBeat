'use client'

import { useState, useEffect } from 'react'
import { useHealthStream } from '@/hooks/use-health-stream'
import type { ConnectionStatus } from '@/hooks/use-health-stream'
import type { HealthMetricPayload, HealthAlertPayload, WatchRiskLevel, WatchStressLevel } from '@/types'


const LOCATION_CACHE_KEY = 'hg_last_location'
const LOCATION_CACHE_MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

type LocationCache = {
  latitude: number
  longitude: number
  /** GPS accuracy in metres from browser Geolocation API at the time of caching. */
  accuracy: number
  cachedAt: number // Unix ms timestamp
}

function isLocationCache(data: unknown): data is LocationCache {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).latitude === 'number' &&
    typeof (data as Record<string, unknown>).longitude === 'number' &&
    typeof (data as Record<string, unknown>).accuracy === 'number' &&
    typeof (data as Record<string, unknown>).cachedAt === 'number'
  )
}

function readLocationCache(): LocationCache | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isLocationCache(parsed)) return null
    if (Date.now() - parsed.cachedAt > LOCATION_CACHE_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeLocationCache(pos: GeolocationPosition): void {
  try {
    const cache: LocationCache = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      cachedAt: Date.now(),
    }
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage unavailable (private browsing, storage full, etc.) — silently ignore
  }
}


/**
 * Formats an ISO 8601 timestamp as a human-readable relative time string.
 * Accepts the current epoch (ms) as a parameter so callers can drive
 * re-renders by ticking a `now` state — avoids Date.now() calls inside render.
 */
function formatRelativeTime(isoString: string, now: number): string {
  const diffMs = now - new Date(isoString).getTime()
  if (diffMs < 0) return 'just now' // clock skew guard
  const secs = Math.floor(diffMs / 1_000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ago`
}

/**
 * Returns the indicator dot CSS class and label text for a given connection status.
 * Centralised here so the component JSX stays readable.
 */
function connectionIndicator(status: ConnectionStatus): { dotClass: string; label: string } {
  switch (status) {
    case 'live':
      return { dotClass: 'bg-risk-safe animate-pulse', label: 'Live' }
    case 'reconnecting':
      return { dotClass: 'bg-risk-caution animate-pulse', label: 'Reconnecting…' }
    case 'offline':
      return { dotClass: 'bg-text-tertiary', label: 'Not paired' }
    default: // 'connecting'
      return { dotClass: 'bg-text-tertiary animate-pulse', label: 'Connecting…' }
  }
}

function riskColor(level: WatchRiskLevel) {
  switch (level) {
    case 'ELEVATED':
      return {
        bg: 'bg-risk-danger-bg',
        border: 'border-risk-danger/20',
        text: 'text-risk-danger-text',
        dot: 'bg-risk-danger',
      }
    case 'CAUTION':
      return {
        bg: 'bg-risk-caution-bg',
        border: 'border-risk-caution/20',
        text: 'text-risk-caution-text',
        dot: 'bg-risk-caution',
      }
    default:
      return {
        bg: 'bg-risk-safe-bg',
        border: 'border-risk-safe/20',
        text: 'text-risk-safe-text',
        dot: 'bg-risk-safe',
      }
  }
}

function stressLabel(level: WatchStressLevel) {
  switch (level) {
    case 'HIGH':
      return { text: 'High', color: 'text-risk-danger-text' }
    case 'MODERATE':
      return { text: 'Moderate', color: 'text-risk-caution-text' }
    default:
      return { text: 'Calm', color: 'text-risk-safe-text' }
  }
}

function MetricTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-surface px-3 py-2">
      <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-semibold text-text-primary leading-tight">{value}</span>
      <span className="text-[10px] text-text-tertiary">{unit}</span>
    </div>
  )
}

function AlertItem({ alert }: { alert: HealthAlertPayload }) {
  const colors = riskColor(alert.riskLevel as WatchRiskLevel)
  const time = new Date(alert.triggeredAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-2 ${colors.bg} ${colors.border}`}>
      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${colors.text}`}>
          {alert.riskLevel === 'ELEVATED' ? 'Elevated Risk' : 'Caution'}
        </p>
        <p className="text-[11px] text-text-secondary line-clamp-2">{alert.message}</p>
      </div>
      <span className="text-[10px] text-text-tertiary shrink-0">{time}</span>
    </div>
  )
}

function LiveMetrics({ metric }: { metric: HealthMetricPayload }) {
  const risk = riskColor(metric.riskLevel)
  const stress = stressLabel(metric.stressLevel)
  const riskDotPulse = metric.riskLevel !== 'NORMAL' ? 'animate-pulse' : ''

  return (
    <div className="space-y-3">
      {/* Risk banner */}
      <div className={`flex items-center gap-2 rounded-lg border p-3 ${risk.bg} ${risk.border}`}>
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${risk.dot} ${riskDotPulse}`} />
        <span className={`text-sm font-semibold ${risk.text}`}>
          Long QT Risk:{' '}
          {metric.riskLevel === 'NORMAL'
            ? 'Normal'
            : metric.riskLevel === 'CAUTION'
              ? 'Caution'
              : 'Elevated'}
        </span>
        {(metric.isAsleep || metric.irregularRhythm) && (
          <div className="ml-auto flex items-center gap-1.5">
            {metric.isAsleep && (
              <span className="text-[10px] bg-brand-light text-brand-deep rounded-full px-2 py-0.5">
                Sleeping
              </span>
            )}
            {metric.irregularRhythm && (
              <span className="text-[10px] bg-risk-danger-bg text-risk-danger-text rounded-full px-2 py-0.5">
                Irregular Rhythm
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricTile label="Heart Rate" value={metric.heartRate > 0 ? String(Math.round(metric.heartRate)) : '—'} unit="bpm" />
        <MetricTile label="HRV" value={metric.hrv > 0 ? String(Math.round(metric.hrv)) : '—'} unit="ms" />
        <MetricTile label="Resting HR" value={metric.restingHR > 0 ? String(Math.round(metric.restingHR)) : '—'} unit="bpm" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricTile label="Steps" value={metric.steps > 0 ? String(Math.round(metric.steps)) : '—'} unit="today" />
        <MetricTile label="Calories" value={metric.activeEnergy > 0 ? String(Math.round(metric.activeEnergy)) : '—'} unit="kcal" />
        <div className="flex flex-col items-center rounded-lg bg-surface px-3 py-2">
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
            Stress
          </span>
          <span className={`text-lg font-semibold leading-tight ${stress.color}`}>
            {stress.text}
          </span>
          <span className="text-[10px] text-text-tertiary">level</span>
        </div>
      </div>
    </div>
  )
}


type SOSResult = { success: boolean; contactsReached: number }

/**
 * Attempts a live GPS fix. On failure (timeout, denied), returns null.
 * On success, also writes the position to localStorage for future fallback.
 */
async function getLiveLocation(): Promise<GeolocationPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        writeLocationCache(pos)
        resolve(pos)
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
    )
  })
}

export function SOSButton() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SOSResult | null>(null)

  // Cache GPS position in the background when the component mounts.
  // This ensures we have a recent fallback even if GPS times out during SOS.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      writeLocationCache,
      () => { /* background cache failure is silent */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }, [])

  async function handleSOS() {
    setSending(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = {}

      // 1. Try a live GPS fix (5s timeout)
      const livePos = await getLiveLocation()

      if (livePos) {
        body.latitude = livePos.coords.latitude
        body.longitude = livePos.coords.longitude
        body.accuracy = livePos.coords.accuracy
        // locationCached defaults to false — no need to send it
      } else {
        // 2. Fall back to the cached location if live GPS failed
        const cached = readLocationCache()
        if (cached) {
          body.latitude = cached.latitude
          body.longitude = cached.longitude
          body.accuracy = cached.accuracy
          body.locationCached = true
        }
        // If no cache either, we send no location data. SOS still fires.
      }

      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: unknown = await res.json()
      const notified =
        res.ok &&
        typeof data === 'object' &&
        data !== null &&
        (data as Record<string, unknown>).notified === true
      const contactsReached =
        typeof data === 'object' &&
        data !== null &&
        typeof (data as Record<string, unknown>).contactsReached === 'number'
          ? ((data as Record<string, unknown>).contactsReached as number)
          : 0
      setResult({ success: notified, contactsReached })
    } catch {
      setResult({ success: false, contactsReached: 0 })
    } finally {
      setSending(false)
      setShowConfirm(false)
      setTimeout(() => setResult(null), 5000)
    }
  }

  if (result) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
          result.success
            ? 'bg-risk-safe-bg text-risk-safe-text'
            : 'bg-risk-danger-bg text-risk-danger-text'
        }`}
      >
        {result.success
          ? `SOS sent to ${result.contactsReached} contact${result.contactsReached !== 1 ? 's' : ''}`
          : 'Failed to send SOS. Check contacts in Settings.'}
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-risk-danger-text font-medium">Alert all contacts?</span>
        <button
          onClick={handleSOS}
          disabled={sending}
          className="px-3 py-1.5 rounded-lg bg-risk-danger text-white text-xs font-semibold hover:bg-[#E53529] disabled:opacity-50 transition-colors"
        >
          {sending ? 'Sending…' : 'Confirm'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary text-xs font-medium hover:bg-separator-light transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-4 py-2 rounded-lg bg-risk-danger text-white text-sm font-bold hover:bg-[#E53529] transition-colors shadow-sm"
    >
      SOS
    </button>
  )
}


/**
 * Apple Watch outline with an EKG pulse line on the face.
 * Used in the empty/not-connected state instead of the generic ⏱ stopwatch.
 */
function WatchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-10 h-10 text-text-tertiary mb-3"
      aria-hidden="true"
    >
      {/* Watch face */}
      <rect x="6" y="7" width="12" height="10" rx="3" />
      {/* Top strap */}
      <path d="M9 7V5h6v2" />
      {/* Bottom strap */}
      <path d="M9 17v2h6v-2" />
      {/* EKG pulse line on face */}
      <path d="M8.5 12h1.5l1-1.5 2 3 1-1.5H17" />
    </svg>
  )
}


export function HealthMonitor() {
  const { latestMetric, recentAlerts, connectionStatus } = useHealthStream()

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const indicator = connectionIndicator(connectionStatus)
  const showUpdatedAt =
    latestMetric !== null &&
    (connectionStatus === 'live' || connectionStatus === 'reconnecting')

  return (
    <div className="rounded-xl bg-surface-raised card-shadow p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-text-primary">Apple Watch</span>
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${indicator.dotClass}`} />
            <span className="text-[10px] text-text-secondary">{indicator.label}</span>
            {showUpdatedAt && (
              <span className="text-[10px] text-text-tertiary">
                · {formatRelativeTime(latestMetric.recordedAt, now)}
              </span>
            )}
          </div>
        </div>
        <SOSButton />
      </div>

      {/* Live metrics or empty state */}
      {latestMetric ? (
        <>
          <LiveMetrics metric={latestMetric} />
          {/*
            Stale-data notice: visible only while reconnecting so users
            know the numbers may not be current.
          */}
          {connectionStatus === 'reconnecting' && (
            <p className="text-[11px] text-risk-caution-text text-center">
              Connection lost — showing last known data
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <WatchIcon />
          <p className="text-sm font-medium text-text-secondary">
            {connectionStatus === 'offline' ? 'No watch connected' : 'Waiting for watch data…'}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {connectionStatus === 'offline'
              ? 'Pair your Apple Watch in Settings to see live health data'
              : 'Ensure your Apple Watch app is open and nearby'}
          </p>
        </div>
      )}

      {/* Recent alerts */}
      {recentAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Recent Alerts
          </h3>
          <div className="space-y-1.5">
            {recentAlerts.slice(0, 3).map((alert, i) => (
              <AlertItem key={`${alert.triggeredAt}-${i}`} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-text-tertiary text-center">
        Not a medical device. For monitoring and awareness only.
      </p>
    </div>
  )
}
