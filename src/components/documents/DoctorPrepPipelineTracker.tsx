'use client'

import { useState, useEffect } from 'react'
import type { PipelineStep } from '@/types'

export function DoctorPrepPipelineTracker({
  steps,
  isGenerating,
  error,
}: {
  steps: PipelineStep[]
  isGenerating: boolean
  error: string | null
}) {
  const [visibleCount, setVisibleCount] = useState(0)

  // Reveal steps one by one with a short delay for animation
  useEffect(() => {
    if (steps.length === 0) return
    if (visibleCount < steps.length) {
      const timer = setTimeout(() => {
        setVisibleCount((c) => c + 1)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [visibleCount, steps.length])

  const visibleSteps = steps.slice(0, visibleCount)
  const stillRevealing = visibleCount < steps.length
  const allDone = !isGenerating && !error && steps.length > 0

  const headerText = error
    ? 'Generation failed'
    : allDone
      ? 'Document ready'
      : 'Preparing your document...'

  return (
    <div className="animate-fade-in-up">
      <div className="bg-surface-raised rounded-2xl card-shadow p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          {error ? (
            <div className="h-5 w-5 rounded-full bg-risk-danger-bg flex items-center justify-center">
              <span className="text-[11px] text-risk-danger-text">&#10005;</span>
            </div>
          ) : allDone ? (
            <div className="h-5 w-5 rounded-full bg-risk-safe-bg flex items-center justify-center">
              <span className="text-[11px] text-risk-safe-text">&#10003;</span>
            </div>
          ) : (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-separator border-t-brand" />
          )}
          <h3 className="text-sm font-semibold text-text-primary">{headerText}</h3>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {visibleSteps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 relative animate-[fadeSlideIn_0.3s_ease-out_both]"
              style={{ animationDelay: `${Math.min(i, 1) * 60}ms` }}
            >
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[9px] top-[22px] bottom-0 w-px bg-separator-light" />
              )}

              {/* Status indicator */}
              <div className="relative z-10 mt-[5px] flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                {step.status === 'HIT' && (
                  <div className="h-[18px] w-[18px] rounded-full bg-risk-safe-bg flex items-center justify-center">
                    <span className="text-[11px] text-risk-safe-text">&#10003;</span>
                  </div>
                )}
                {step.status === 'ERROR' && (
                  <div className="h-[18px] w-[18px] rounded-full bg-risk-danger-bg flex items-center justify-center">
                    <span className="text-[11px] text-risk-danger-text">&#10005;</span>
                  </div>
                )}
                {(step.status === 'MISS' || step.status === 'SKIPPED') && (
                  <div className="h-[18px] w-[18px] rounded-full bg-surface flex items-center justify-center">
                    <span className="text-[11px] text-text-tertiary">&mdash;</span>
                  </div>
                )}
              </div>

              {/* Label + detail */}
              <div className="flex-1 pb-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-primary">{step.name}</span>
                  <span className="font-mono text-[10px] text-text-tertiary">
                    {step.durationMs > 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
                  </span>
                </div>
                {step.detail && (
                  <p className="mt-0.5 text-[11px] text-text-secondary leading-tight">{step.detail}</p>
                )}
              </div>
            </div>
          ))}

          {/* Active step indicator while generating */}
          {isGenerating && (
            <div className="flex items-center gap-3">
              <div className="relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-separator-light border-t-brand" />
              </div>
              <span className="text-xs text-text-tertiary animate-pulse">
                {stillRevealing && steps[visibleCount]
                  ? steps[visibleCount].name
                  : 'Processing...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
