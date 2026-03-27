'use client'

import { useState } from 'react'
import type { PipelineStep, PipelineStepStatus } from '@/types'

function stepStatusIcon(status: PipelineStepStatus) {
  switch (status) {
    case 'HIT':
      return <span className="text-emerald-500">&#10003;</span>
    case 'MISS':
      return <span className="text-neutral-400">&mdash;</span>
    case 'SKIPPED':
      return <span className="text-neutral-300">&#8226;</span>
    case 'ERROR':
      return <span className="text-red-500">&#10005;</span>
  }
}

function stepStatusColor(status: PipelineStepStatus) {
  switch (status) {
    case 'HIT':
      return 'border-emerald-200'
    case 'ERROR':
      return 'border-red-200'
    default:
      return 'border-neutral-200'
  }
}

export function PipelineTrace({ steps }: { steps: PipelineStep[] }) {
  const [open, setOpen] = useState(false)
  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0)
  const hitCount = steps.filter((s) => s.status === 'HIT').length

  return (
    <div className="rounded-xl border border-neutral-200 bg-white print:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-medium text-neutral-700">
            How we verified this
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">
            {hitCount}/{steps.length} sources &middot; {totalMs > 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`}
          </span>
          <svg
            className={`h-4 w-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${stepStatusColor(step.status)}`}
              >
                <div className="mt-0.5 w-5 text-center text-sm font-bold leading-none">
                  {stepStatusIcon(step.status)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-700">
                      {step.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        step.status === 'HIT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : step.status === 'ERROR'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {step.status}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {step.durationMs > 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
                      </span>
                    </div>
                  </div>
                  {step.detail && (
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-neutral-400">
            Pipeline: Local DB &rarr; Fuzzy Match &rarr; BG Database &rarr; AI Analysis
          </p>
        </div>
      )}
    </div>
  )
}
