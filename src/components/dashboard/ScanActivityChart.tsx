'use client'

import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { ScanActivityDay } from '@/types'

type ScanActivityChartProps = {
  scanActivity: ScanActivityDay[]
  loading?: boolean
}

export function ScanActivityChart({ scanActivity, loading }: ScanActivityChartProps) {
  const totalScans = scanActivity.reduce((sum, d) => sum + d.count, 0)
  const maxCount = Math.max(...scanActivity.map((d) => d.count), 1)

  if (loading) {
    return (
      <div className="rounded-2xl bg-surface-raised card-shadow p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-surface shimmer-bg" />
          <div className="w-24 h-4 rounded bg-surface shimmer-bg" />
        </div>
        <div className="h-[140px] flex items-end gap-2 px-2">
          {[45, 70, 30, 85, 55, 65, 40].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-surface shimmer-bg" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (totalScans === 0) {
    return (
      <div className="rounded-2xl bg-surface-raised card-shadow p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Medicine Scans</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm font-medium text-text-secondary mb-1">No medicine scans this week</p>
          <p className="text-xs text-text-tertiary mb-4">Scan a medication to see activity here</p>
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Scan Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-raised card-shadow p-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Medicine Scans</span>
        </div>
        <span className="text-xs text-text-tertiary">{totalScans} this week</span>
      </div>

      {/* Chart */}
      <div className="h-[140px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={scanActivity} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#AEAEB2' }}
            />
            <YAxis
              hide
              domain={[0, Math.ceil(maxCount * 1.2)]}
              allowDecimals={false}
            />
            <Bar dataKey="knownRisk" stackId="risk" fill="#FF3B30" radius={[0, 0, 0, 0]} animationDuration={600} />
            <Bar dataKey="possibleRisk" stackId="risk" fill="#FF9F0A" radius={[0, 0, 0, 0]} animationDuration={600} />
            <Bar dataKey="conditionalRisk" stackId="risk" fill="#FFD60A" radius={[0, 0, 0, 0]} animationDuration={600} />
            <Bar dataKey="safe" stackId="risk" fill="#34C759" radius={[4, 4, 0, 0]} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
