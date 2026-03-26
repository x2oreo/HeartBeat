'use client'

import { useHealthStream } from '@/hooks/use-health-stream'
import type { HealthMetricPayload, HealthAlertPayload, WatchRiskLevel, WatchStressLevel } from '@/types'

function riskColor(level: WatchRiskLevel) {
  switch (level) {
    case 'ELEVATED':
      return {
        bg: 'bg-red-50 dark:bg-red-950/40',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-300',
        dot: 'bg-red-500',
      }
    case 'CAUTION':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
      }
    default:
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-500',
      }
  }
}

function stressLabel(level: WatchStressLevel) {
  switch (level) {
    case 'HIGH': return { text: 'High', color: 'text-red-600 dark:text-red-400' }
    case 'MODERATE': return { text: 'Moderate', color: 'text-amber-600 dark:text-amber-400' }
    default: return { text: 'Calm', color: 'text-emerald-600 dark:text-emerald-400' }
  }
}

function MetricTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2">
      <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
        {value}
      </span>
      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{unit}</span>
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
        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
          {alert.message}
        </p>
      </div>
      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">{time}</span>
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
          <span className="ml-auto text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5">
            Sleeping
          </span>
        )}
        {metric.irregularRhythm && (
          <span className="ml-auto text-[10px] bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5">
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
        <div className="flex flex-col items-center rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2">
          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Stress
          </span>
          <span className={`text-lg font-semibold leading-tight ${stress.color}`}>
            {stress.text}
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">level</span>
        </div>
      </div>
    </div>
  )
}

export function HealthMonitor() {
  const { latestMetric, recentAlerts, isConnected } = useHealthStream()

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Apple Watch
          </span>
          <div className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Live metrics or empty state */}
      {latestMetric ? (
        <LiveMetrics metric={latestMetric} />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-2 text-2xl">&#9201;</div>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            No watch data yet
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Pair your Apple Watch in Settings to see live health data
          </p>
        </div>
      )}

      {/* Recent alerts */}
      {recentAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
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
      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
        Not a medical device. For monitoring and awareness only.
      </p>
    </div>
  )
}
