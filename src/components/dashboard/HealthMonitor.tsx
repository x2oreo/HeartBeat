'use client'

import { useState } from 'react'
import { useHealthStream } from '@/hooks/use-health-stream'
import type { HealthMetricPayload, HealthAlertPayload, WatchRiskLevel, WatchStressLevel } from '@/types'

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
    case 'HIGH': return { text: 'High', color: 'text-risk-danger-text' }
    case 'MODERATE': return { text: 'Moderate', color: 'text-risk-caution-text' }
    default: return { text: 'Calm', color: 'text-risk-safe-text' }
  }
}

function MetricTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-surface px-3 py-2">
      <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-semibold text-text-primary leading-tight">
        {value}
      </span>
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
        <p className="text-[11px] text-text-secondary truncate">
          {alert.message}
        </p>
      </div>
      <span className="text-[10px] text-text-tertiary shrink-0">{time}</span>
    </div>
  )
}

function LiveMetrics({ metric }: { metric: HealthMetricPayload }) {
  const risk = riskColor(metric.riskLevel)
  const stress = stressLabel(metric.stressLevel)

  return (
    <div className="space-y-3">
      {/* Risk banner */}
      <div className={`flex items-center gap-2 rounded-lg border p-3 ${risk.bg} ${risk.border}`}>
        <div className={`h-2.5 w-2.5 rounded-full ${risk.dot} animate-pulse`} />
        <span className={`text-sm font-semibold ${risk.text}`}>
          Long QT Risk: {metric.riskLevel === 'NORMAL' ? 'Normal' : metric.riskLevel === 'CAUTION' ? 'Caution' : 'Elevated'}
        </span>
        {metric.isAsleep && (
          <span className="ml-auto text-[10px] bg-brand-light text-brand-deep rounded-full px-2 py-0.5">
            Sleeping
          </span>
        )}
        {metric.irregularRhythm && (
          <span className="ml-auto text-[10px] bg-risk-danger-bg text-risk-danger-text rounded-full px-2 py-0.5">
            Irregular Rhythm
          </span>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2">
        <MetricTile label="Heart Rate" value={metric.heartRate > 0 ? String(Math.round(metric.heartRate)) : '—'} unit="bpm" />
        <MetricTile label="HRV" value={metric.hrv > 0 ? String(Math.round(metric.hrv)) : '—'} unit="ms" />
        <MetricTile label="Resting HR" value={metric.restingHR > 0 ? String(Math.round(metric.restingHR)) : '—'} unit="bpm" />
      </div>

      <div className="grid grid-cols-3 gap-2">
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

function SOSButton() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; contactsReached: number } | null>(null)

  async function handleSOS() {
    setSending(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = {}
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000,
          })
        }).catch(() => null)
        if (pos) {
          body.latitude = pos.coords.latitude
          body.longitude = pos.coords.longitude
        }
      }

      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setResult({ success: res.ok && data.notified, contactsReached: data.contactsReached ?? 0 })
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
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        result.success
          ? 'bg-risk-safe-bg text-risk-safe-text'
          : 'bg-risk-danger-bg text-risk-danger-text'
      }`}>
        {result.success
          ? `SOS sent to ${result.contactsReached} contact${result.contactsReached !== 1 ? 's' : ''}`
          : 'Failed to send SOS. Check contacts in Settings.'}
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-risk-danger-text font-medium">Alert all contacts?</span>
        <button
          onClick={handleSOS}
          disabled={sending}
          className="px-3 py-1.5 rounded-lg bg-risk-danger text-white text-xs font-semibold hover:bg-[#E53529] disabled:opacity-50 transition-colors"
        >
          {sending ? 'Sending...' : 'Confirm'}
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
      className="px-3 py-1.5 rounded-lg bg-risk-danger text-white text-xs font-bold hover:bg-[#E53529] transition-colors shadow-sm"
    >
      SOS
    </button>
  )
}

export function HealthMonitor() {
  const { latestMetric, recentAlerts, isConnected } = useHealthStream()

  return (
    <div className="rounded-xl bg-surface-raised card-shadow p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-text-primary">
            Apple Watch
          </span>
          <div className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-risk-safe animate-pulse' : 'bg-text-tertiary'}`} />
            <span className="text-[10px] text-text-secondary">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>
        <SOSButton />
      </div>

      {/* Live metrics or empty state */}
      {latestMetric ? (
        <LiveMetrics metric={latestMetric} />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-2 text-2xl">&#9201;</div>
          <p className="text-sm font-medium text-text-secondary">
            No watch data yet
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            Pair your Apple Watch in Settings to see live health data
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
