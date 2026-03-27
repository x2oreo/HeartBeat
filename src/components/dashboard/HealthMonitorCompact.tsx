'use client'

import Link from 'next/link'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { useHealthStream } from '@/hooks/use-health-stream'
import type { HeartRatePoint, WatchRiskLevel } from '@/types'

type HealthMonitorCompactProps = {
  heartRateHistory: HeartRatePoint[]
  watchPaired: boolean
}

const riskAccent: Record<WatchRiskLevel, string> = {
  NORMAL: 'bg-risk-safe',
  CAUTION: 'bg-risk-caution',
  ELEVATED: 'bg-risk-danger',
}

export function HealthMonitorCompact({ heartRateHistory, watchPaired }: HealthMonitorCompactProps) {
  const { latestMetric, isConnected } = useHealthStream()

  // Merge live data onto historical sparkline
  const chartData = [...heartRateHistory]
  if (latestMetric && latestMetric.heartRate > 0) {
    chartData.push({ time: 'now', hr: Math.round(latestMetric.heartRate) })
  }

  const currentHR = latestMetric?.heartRate ? Math.round(latestMetric.heartRate) : null
  const currentHRV = latestMetric?.hrv ? Math.round(latestMetric.hrv) : null
  const currentRestingHR = latestMetric?.restingHR ? Math.round(latestMetric.restingHR) : null
  const riskLevel = latestMetric?.riskLevel ?? 'NORMAL'

  if (!watchPaired && !latestMetric) {
    return (
      <div className="rounded-2xl bg-surface-raised card-shadow p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Heart Rate</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">No Apple Watch paired</p>
          <p className="text-xs text-text-tertiary mb-4">Connect your watch to see live health data</p>
          <Link
            href="/watch"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pair Watch
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-raised card-shadow overflow-hidden animate-fade-in-up">
      <div className="p-5 pb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-risk-danger" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span className="text-sm font-semibold text-text-primary">Heart Rate</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface">
            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-risk-safe animate-pulse' : 'bg-text-tertiary'}`} />
            <span className="text-[10px] font-medium text-text-secondary">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Hero number */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-[42px] font-bold text-text-primary leading-none tracking-tight">
            {currentHR ?? '--'}
          </span>
          <span className="text-sm font-medium text-text-tertiary mb-1">bpm</span>
        </div>
      </div>

      {/* Sparkline */}
      {chartData.length > 1 ? (
        <div className="h-16 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#FF3B30" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
              <Area
                type="monotone"
                dataKey="hr"
                stroke="#FF3B30"
                strokeWidth={2}
                fill="url(#hrGradient)"
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center">
          <p className="text-xs text-text-tertiary">Waiting for data...</p>
        </div>
      )}

      {/* Bottom stats + risk strip */}
      <div className="px-5 py-3 flex items-center gap-3 border-t border-separator-light">
        <div className="flex-1 flex items-center gap-4">
          <div>
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">HRV</p>
            <p className="text-sm font-semibold text-text-primary">{currentHRV ?? '--'} <span className="text-text-tertiary font-normal text-xs">ms</span></p>
          </div>
          <div className="w-px h-6 bg-separator-light" />
          <div>
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">Resting</p>
            <p className="text-sm font-semibold text-text-primary">{currentRestingHR ?? '--'} <span className="text-text-tertiary font-normal text-xs">bpm</span></p>
          </div>
        </div>
      </div>

      {/* Risk accent strip */}
      <div className={`h-1 ${riskAccent[riskLevel]} transition-colors duration-500`} />
    </div>
  )
}
