'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useHealthStream } from '@/hooks/use-health-stream'
import { useWatchDashboard } from '@/hooks/use-watch-dashboard'
import type {
  WatchDashboardData,
  WatchRiskLevel,
  WatchAlert,
} from '@/types'

// ── Helpers ────────────────────────────────────────────────────────

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const RISK_COLORS: Record<WatchRiskLevel, { bg: string; text: string; dot: string; label: string }> = {
  NORMAL: { bg: 'bg-risk-safe-bg', text: 'text-risk-safe-text', dot: 'bg-risk-safe', label: 'Normal' },
  CAUTION: { bg: 'bg-risk-caution-bg', text: 'text-risk-caution-text', dot: 'bg-risk-caution', label: 'Caution' },
  ELEVATED: { bg: 'bg-risk-danger-bg', text: 'text-risk-danger-text', dot: 'bg-risk-danger', label: 'Elevated' },
}

const STRESS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CALM: { color: 'text-risk-safe', bg: 'bg-risk-safe-bg', label: 'Calm' },
  MODERATE: { color: 'text-risk-caution', bg: 'bg-risk-caution-bg', label: 'Moderate' },
  HIGH: { color: 'text-risk-danger', bg: 'bg-risk-danger-bg', label: 'High' },
}

// ── Custom Tooltip ─────────────────────────────────────────────────

function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: Array<{ value: number }>; unit: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-text-primary text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
      {Math.round(payload[0].value)} {unit}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────

type WatchDashboardProps = {
  initialData: WatchDashboardData
}

export function WatchDashboard({ initialData }: WatchDashboardProps) {
  const { data, refetch } = useWatchDashboard(initialData)
  const { latestMetric, connectionStatus } = useHealthStream()
  const isConnected = connectionStatus === 'live'
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)

  const dashData = data ?? initialData

  // Live values from SSE, fall back to latest historical
  const currentHR = latestMetric?.heartRate ? Math.round(latestMetric.heartRate) : null
  const currentHRV = latestMetric?.hrv ? Math.round(latestMetric.hrv) : null
  const currentRestingHR = latestMetric?.restingHR ? Math.round(latestMetric.restingHR) : null
  const currentRisk = latestMetric?.riskLevel ?? 'NORMAL'
  const currentStress = latestMetric?.stressLevel ?? 'CALM'

  // Merge live point onto chart data
  const hrChartData = [...dashData.metrics.heartRate]
  if (latestMetric && latestMetric.heartRate > 0) {
    hrChartData.push({ time: 'Now', hr: Math.round(latestMetric.heartRate) })
  }
  const hrvChartData = [...dashData.metrics.hrv]
  if (latestMetric && latestMetric.hrv > 0) {
    hrvChartData.push({ time: 'Now', hrv: Math.round(latestMetric.hrv) })
  }

  async function handleAcknowledge(alertId: string) {
    setAcknowledgingId(alertId)
    try {
      const res = await fetch(`/api/watch/alerts/${alertId}/acknowledge`, { method: 'POST' })
      if (res.ok) refetch()
    } finally {
      setAcknowledgingId(null)
    }
  }

  // Risk timeline percentages
  const riskSegments = computeRiskSegments(dashData.metrics.riskTimeline)

  return (
    <div className="px-4 py-8 max-w-2xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
              {/* Watch bands */}
              <path d="M14 7V2M26 7V2M14 33v5M26 33v5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              {/* Squircle watch body */}
              <rect x="8" y="7" width="24" height="26" rx="7" stroke="white" strokeWidth="2.5" fill="none" />
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
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Apple Watch</h1>
            {dashData.device.lastSeen && (
              <p className="text-[11px] text-text-tertiary">Last seen {formatRelativeTime(dashData.device.lastSeen)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface">
          <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-risk-safe animate-pulse' : 'bg-text-tertiary'}`} />
          <span className="text-[10px] font-medium text-text-secondary">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* ── Live Vitals ─────────────────────────────────────────── */}
      <div className="bg-surface-raised rounded-2xl card-shadow overflow-hidden animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-0">
            {/* Heart Rate */}
            <div className="text-center">
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide mb-1">Heart Rate</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[36px] font-bold text-text-primary leading-none tracking-tight">
                  {currentHR ?? '--'}
                </span>
                <span className="text-xs font-medium text-text-tertiary">bpm</span>
              </div>
            </div>

            {/* HRV */}
            <div className="text-center border-x border-separator-light">
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide mb-1">HRV / SDNN</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[36px] font-bold text-brand leading-none tracking-tight">
                  {currentHRV ?? '--'}
                </span>
                <span className="text-xs font-medium text-text-tertiary">ms</span>
              </div>
            </div>

            {/* Resting HR */}
            <div className="text-center">
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide mb-1">Resting</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[36px] font-bold text-text-primary leading-none tracking-tight">
                  {currentRestingHR ?? '--'}
                </span>
                <span className="text-xs font-medium text-text-tertiary">bpm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk accent strip */}
        <div className={`h-1 ${RISK_COLORS[currentRisk].dot} transition-colors duration-500`} />
      </div>

      {/* ── Heart Rate Chart ────────────────────────────────────── */}
      <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-risk-danger" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">Heart Rate</span>
          </div>
          <span className="text-xs text-text-tertiary">24h</span>
        </div>

        {hrChartData.length > 1 ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="watchHrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#FF3B30" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#AEAEB2' }}
                  interval="preserveStartEnd"
                />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                <Tooltip content={<ChartTooltip unit="bpm" />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="hr"
                  stroke="#FF3B30"
                  strokeWidth={2}
                  fill="url(#watchHrGradient)"
                  dot={false}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-text-tertiary">No heart rate data in the last 24 hours</p>
          </div>
        )}
      </div>

      {/* ── HRV Chart ───────────────────────────────────────────── */}
      <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">HRV / SDNN</span>
          </div>
          <span className="text-xs text-text-tertiary">24h</span>
        </div>

        {hrvChartData.length > 1 ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrvChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="watchHrvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3478F6" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#3478F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#AEAEB2' }}
                  interval="preserveStartEnd"
                />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                <Tooltip content={<ChartTooltip unit="ms" />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="hrv"
                  stroke="#3478F6"
                  strokeWidth={2}
                  fill="url(#watchHrvGradient)"
                  dot={false}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-text-tertiary">No HRV data in the last 24 hours</p>
          </div>
        )}
      </div>

      {/* ── Risk Timeline ───────────────────────────────────────── */}
      {riskSegments.length > 0 && (
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">Risk Timeline</span>
            <span className="text-xs text-text-tertiary ml-auto">24h</span>
          </div>

          {/* Segmented bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-px bg-surface">
            {riskSegments.map((seg, i) => (
              <div
                key={i}
                className={`${RISK_COLORS[seg.level].dot} transition-all duration-300`}
                style={{ width: `${seg.pct}%`, minWidth: seg.pct > 0 ? '2px' : '0' }}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            {(['NORMAL', 'CAUTION', 'ELEVATED'] as WatchRiskLevel[]).map((level) => {
              const seg = riskSegments.find((s) => s.level === level)
              const pct = seg?.pct ?? 0
              return (
                <div key={level} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${RISK_COLORS[level].dot}`} />
                  <span className="text-[11px] text-text-secondary">
                    {RISK_COLORS[level].label} {pct > 0 ? `${Math.round(pct)}%` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Today's Stats ───────────────────────────────────────── */}
      <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 px-1">Today</p>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="Steps" value={dashData.todayStats.totalSteps.toLocaleString()} />
          <StatTile label="Active Cal" value={dashData.todayStats.totalActiveEnergy > 0 ? `${dashData.todayStats.totalActiveEnergy}` : '--'} unit="kcal" />
          <StatTile label="Avg HR" value={dashData.todayStats.avgHR?.toString() ?? '--'} unit="bpm" />
          <StatTile label="Avg HRV" value={dashData.todayStats.avgHRV?.toString() ?? '--'} unit="ms" />
          <StatTile label="Min HR" value={dashData.todayStats.minHR?.toString() ?? '--'} unit="bpm" />
          <StatTile label="Max HR" value={dashData.todayStats.maxHR?.toString() ?? '--'} unit="bpm" />
        </div>
      </div>

      {/* ── Stress Level ────────────────────────────────────────── */}
      {latestMetric && (
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
              <span className="text-sm font-semibold text-text-primary">Stress Level</span>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STRESS_CONFIG[currentStress].bg} ${STRESS_CONFIG[currentStress].color}`}>
              {STRESS_CONFIG[currentStress].label}
            </span>
          </div>
        </div>
      )}

      {/* ── Recent Alerts ───────────────────────────────────────── */}
      <div className="bg-surface-raised rounded-2xl card-shadow overflow-hidden animate-fade-in-up" style={{ animationDelay: '420ms' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-risk-caution" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">Recent Alerts</span>
          </div>
          <span className="text-xs text-text-tertiary">{dashData.alerts.length} total</span>
        </div>

        {dashData.alerts.length === 0 ? (
          <div className="px-5 pb-5 text-center py-6">
            <p className="text-sm text-text-secondary">No alerts recorded</p>
            <p className="text-xs text-text-tertiary mt-0.5">Alerts appear when elevated risk is detected</p>
          </div>
        ) : (
          <div className="divide-y divide-separator-light">
            {dashData.alerts.slice(0, 10).map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                acknowledging={acknowledgingId === alert.id}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Watch Info ──────────────────────────────────────────── */}
      <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '480ms' }}>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Watch Info</p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Connection</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-risk-safe' : 'bg-text-tertiary'}`} />
              <span className="text-sm font-medium text-text-primary">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Monitoring Mode</span>
            <span className="text-sm font-medium text-text-primary capitalize">{dashData.device.monitoringMode}</span>
          </div>
          {dashData.device.lastSeen && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Last Seen</span>
              <span className="text-sm font-medium text-text-primary">{formatRelativeTime(dashData.device.lastSeen)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-text-tertiary text-center px-4 animate-fade-in-up" style={{ animationDelay: '540ms' }}>
        QTShield is not a medical device. Always consult your cardiologist for medical decisions.
      </p>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-surface-raised rounded-xl card-shadow p-3 text-center">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">{label}</p>
      <div className="flex items-baseline justify-center gap-0.5 mt-1">
        <span className="text-lg font-bold text-text-primary leading-none">{value}</span>
        {unit && <span className="text-[10px] text-text-tertiary">{unit}</span>}
      </div>
    </div>
  )
}

function AlertRow({
  alert,
  acknowledging,
  onAcknowledge,
}: {
  alert: WatchAlert
  acknowledging: boolean
  onAcknowledge: (id: string) => void
}) {
  const riskLevel = alert.riskLevel as WatchRiskLevel
  const risk = RISK_COLORS[riskLevel] ?? RISK_COLORS.CAUTION

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${risk.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{alert.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${risk.bg} ${risk.text}`}>
            {risk.label}
          </span>
          <span className="text-[10px] text-text-tertiary">
            {Math.round(alert.heartRate)} bpm
          </span>
          <span className="text-[10px] text-text-tertiary">
            {Math.round(alert.hrv)} ms HRV
          </span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[10px] text-text-tertiary">{formatRelativeTime(alert.triggeredAt)}</span>
        {alert.acknowledged ? (
          <span className="text-[10px] text-risk-safe font-medium">Acknowledged</span>
        ) : (
          <button
            onClick={() => onAcknowledge(alert.id)}
            disabled={acknowledging}
            className="text-[10px] font-semibold text-brand hover:text-brand-hover transition-colors disabled:opacity-50"
          >
            {acknowledging ? 'Saving...' : 'Acknowledge'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Risk segment computation ───────────────────────────────────────

function computeRiskSegments(
  timeline: { time: string; level: WatchRiskLevel }[]
): { level: WatchRiskLevel; pct: number }[] {
  if (timeline.length === 0) return []

  const now = Date.now()
  const segments: { level: WatchRiskLevel; duration: number }[] = []

  for (let i = 0; i < timeline.length; i++) {
    const start = new Date(timeline[i].time).getTime()
    const end = i + 1 < timeline.length ? new Date(timeline[i + 1].time).getTime() : now
    segments.push({ level: timeline[i].level, duration: end - start })
  }

  const total = segments.reduce((sum, s) => sum + s.duration, 0)
  if (total === 0) return []

  // Merge consecutive same-level segments and compute percentages
  const merged: { level: WatchRiskLevel; pct: number }[] = []
  for (const seg of segments) {
    const pct = (seg.duration / total) * 100
    if (merged.length > 0 && merged[merged.length - 1].level === seg.level) {
      merged[merged.length - 1].pct += pct
    } else {
      merged.push({ level: seg.level, pct })
    }
  }

  return merged
}
