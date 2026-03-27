'use client'

import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

type MedicationRiskChartProps = {
  medications: { genericName: string; qtRisk: string; isDTA: boolean }[]
  cypConflictCount: number
}

const RISK_SEGMENTS = [
  { key: 'KNOWN_RISK', label: 'Known Risk', color: '#FF3B30' },
  { key: 'POSSIBLE_RISK', label: 'Possible Risk', color: '#FF9F0A' },
  { key: 'CONDITIONAL_RISK', label: 'Conditional', color: '#FFD60A' },
  { key: 'NOT_LISTED', label: 'Not Listed', color: '#34C759' },
] as const

export function MedicationRiskChart({ medications, cypConflictCount }: MedicationRiskChartProps) {
  if (medications.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-raised card-shadow p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Medications</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">No medications yet</p>
          <p className="text-xs text-text-tertiary mb-4">Add your medications to see risk breakdown</p>
          <Link
            href="/medications"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Add Medications
          </Link>
        </div>
      </div>
    )
  }

  const segments = RISK_SEGMENTS.map((seg) => ({
    ...seg,
    value: medications.filter((m) => m.qtRisk === seg.key).length,
  })).filter((seg) => seg.value > 0)

  // If all meds are the same category, add a tiny invisible slice so the donut renders
  const chartData = segments.length === 1
    ? [...segments, { key: '_pad', label: '', color: segments[0].color, value: 0.001 }]
    : segments

  return (
    <div className="rounded-2xl bg-surface-raised card-shadow p-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Medications</span>
        </div>
        {cypConflictCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-risk-danger-bg text-risk-danger-text text-[10px] font-semibold">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            {cypConflictCount} CYP
          </span>
        )}
      </div>

      {/* Chart + center label */}
      <div className="relative mx-auto" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={segments.length > 1 ? 3 : 0}
              dataKey="value"
              strokeWidth={0}
              animationBegin={200}
              animationDuration={600}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-text-primary leading-none">{medications.length}</span>
          <span className="text-[10px] text-text-tertiary mt-0.5">total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-text-secondary">
              {seg.label} <span className="font-semibold text-text-primary">{seg.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
