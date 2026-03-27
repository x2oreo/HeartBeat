'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { ScanResult, RiskCategory, ComboRiskLevel, PipelineStep, PipelineStepStatus } from '@/types'
import { useDrugScan } from '@/hooks/use-drug-scan'
import { useMedications } from '@/hooks/use-medications'
import { DrugSearchInput } from '@/components/shared/DrugSearchInput'

// ── History types ────────────────────────────────────────────────────

type ScanHistoryEntry = {
  id: string
  drugName: string
  genericName: string
  riskCategory: string
  comboRisk: string | null
  scanType: string
  createdAt: string
  fullResult: ScanResult | null
}

// ── Helpers ─────────────────────────────────────────────────────────

function riskColor(category: RiskCategory, isDTA: boolean) {
  if (category === 'KNOWN_RISK' || isDTA)
    return {
      bg: 'bg-[#FFEDEC]',
      border: 'border-[#FF3B30]/20',
      text: 'text-[#C41E16]',
      icon: 'text-[#FF3B30]',
      badge: 'bg-[#FFEDEC] text-[#C41E16]',
    }
  if (category === 'POSSIBLE_RISK' || category === 'CONDITIONAL_RISK')
    return {
      bg: 'bg-[#FFF5E0]',
      border: 'border-[#FF9F0A]/20',
      text: 'text-[#8A5600]',
      icon: 'text-[#FF9F0A]',
      badge: 'bg-[#FFF5E0] text-[#8A5600]',
    }
  return {
    bg: 'bg-[#EAFBF0]',
    border: 'border-[#34C759]/20',
    text: 'text-[#1B7A34]',
    icon: 'text-[#34C759]',
    badge: 'bg-[#EAFBF0] text-[#1B7A34]',
  }
}

function riskHeadline(category: RiskCategory, isDTA: boolean) {
  if (category === 'KNOWN_RISK' || isDTA)
    return { icon: '\u2715', text: 'DANGER — This medication can prolong QT interval' }
  if (category === 'POSSIBLE_RISK')
    return { icon: '\u26A0', text: 'Possible QT risk — discuss with your cardiologist' }
  if (category === 'CONDITIONAL_RISK')
    return { icon: '\u26A0', text: 'Conditional QT risk — depends on dosage and conditions' }
  return { icon: '\u2713', text: 'This medication is not on the QT risk list' }
}

function comboColor(level: ComboRiskLevel) {
  if (level === 'CRITICAL' || level === 'HIGH')
    return 'bg-[#FFEDEC] text-[#C41E16]'
  if (level === 'MEDIUM')
    return 'bg-[#FFF5E0] text-[#8A5600]'
  return 'bg-[#EAFBF0] text-[#1B7A34]'
}


function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return reject(new Error('Failed to read file'))
      // Strip the data URL prefix (e.g. "data:image/heic;base64,")
      const base64 = result.split(',')[1]
      if (!base64) return reject(new Error('Empty file'))
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// ── Components ──────────────────────────────────────────────────────

function ExpandableText({ text, className, lines = 2 }: { text: string; className?: string; lines?: number }) {
  const [expanded, setExpanded] = useState(false)
  const clampClass = lines === 2 ? 'line-clamp-2' : lines === 3 ? 'line-clamp-3' : 'line-clamp-1'
  const isLong = text.length > 100

  if (!isLong) return <p className={className ?? ''}>{text}</p>

  return (
    <div>
      <p className={`${className ?? ''} ${expanded ? '' : clampClass}`}>
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
      >
        {expanded ? 'Read less' : 'Read more'}
        <svg
          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-500 dark:border-neutral-600 dark:border-t-blue-400" />
  )
}

const HIDDEN_PIPELINE_STEPS = new Set(['FDA Safety Reports'])

function LivePipelineTracker({ steps, loading }: { steps: PipelineStep[]; loading: boolean }) {
  steps = steps.filter((s) => !HIDDEN_PIPELINE_STEPS.has(s.name))
  const [visibleCount, setVisibleCount] = useState(0)

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

  if (steps.length === 0 && !loading) return null

  return (
    <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 print:hidden">
      <div className="flex items-center gap-2 mb-3">
        {(loading || stillRevealing) && <Spinner />}
        {!loading && !stillRevealing && (
          <div className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">&#10003;</span>
          </div>
        )}
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {loading || stillRevealing ? 'Analyzing medication...' : 'Verification complete'}
        </h3>
      </div>
      <PipelineStepList steps={visibleSteps} animate />
      {(loading || stillRevealing) && (
        <div className="flex items-center gap-3 mt-1">
          <div className="relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
            <Spinner />
          </div>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 animate-pulse">
            {stillRevealing ? steps[visibleCount]?.name ?? 'Processing...' : 'Processing...'}
          </span>
        </div>
      )}
    </div>
  )
}

function sourceLabel(source: ScanResult['source']): string {
  switch (source) {
    case 'CREDIBLEMEDS_VERIFIED': return 'US Database (CredibleMeds)'
    case 'CREDIBLEMEDS_API': return 'US Database (CredibleMeds API)'
    case 'MULTI_SOURCE': return 'US Database (Multi-Source)'
    case 'BG_VERIFIED': return 'BG Database (Positive Drug List)'
    case 'AI_ENRICHED': return 'AI Assessment + External Data'
    case 'AI_ASSESSED': return 'AI Assessment Only'
  }
}

function sourceBadgeStyle(source: ScanResult['source']): string {
  switch (source) {
    case 'CREDIBLEMEDS_VERIFIED':
    case 'CREDIBLEMEDS_API':
    case 'MULTI_SOURCE':
      return 'bg-brand-light text-brand'
    case 'BG_VERIFIED':
      return 'bg-teal-light text-teal'
    case 'AI_ENRICHED':
      return 'bg-coral-light text-coral-deep'
    case 'AI_ASSESSED':
      return 'bg-risk-caution-bg text-risk-caution-text'
  }
}

function ResultCard({ result, showActions = true }: { result: ScanResult; showActions?: boolean }) {
  const colors = riskColor(result.riskCategory, result.isDTA)
  const headline = riskHeadline(result.riskCategory, result.isDTA)

  return (
    <div className="space-y-4">
      {/* Fuzzy match banner */}
      {result.fuzzyMatch && (
        <div className="rounded-xl border border-brand/20 bg-brand-light p-3">
          <p className="text-sm text-brand-deep">
            Showing results for <strong>{result.fuzzyMatch.matchedName}</strong>
            {result.fuzzyMatch.originalQuery !== result.fuzzyMatch.matchedName && (
              <> (you searched for &ldquo;{result.fuzzyMatch.originalQuery}&rdquo;)</>
            )}
          </p>
        </div>
      )}

      {/* AI-only warning */}
      {result.source === 'AI_ASSESSED' && (
        <div className="rounded-xl border border-risk-caution/20 bg-risk-caution-bg p-3">
          <p className="text-sm font-medium text-risk-caution-text">
            This drug was not found in any verified medical database. This assessment is based on AI analysis only. Please consult your cardiologist.
          </p>
        </div>
      )}

      {/* Main risk card */}
      <div className={`rounded-2xl border-2 p-5 ${colors.bg} ${colors.border}`}>
        <div className="flex items-start gap-3">
          <span className={`text-3xl leading-none ${colors.icon}`}>{headline.icon}</span>
          <div>
            <p className={`text-lg font-semibold ${colors.text}`}>{headline.text}</p>
            {result.isDTA && result.riskCategory === 'KNOWN_RISK' && (
              <p className={`mt-1 text-sm font-medium ${colors.text}`}>
                Designated Torsades de Pointes Agent (DTA) — highest risk category
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Drug info */}
      <div className="rounded-2xl bg-surface-raised p-5 card-shadow">
        <h3 className="text-[15px] font-semibold text-text-primary capitalize">
          {result.genericName}
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-text-secondary">Drug Class</dt>
            <dd className="text-text-primary">{result.drugClass}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-text-secondary">Primary Use</dt>
            <dd className="text-text-primary">{result.primaryUse}</dd>
          </div>
          {result.dosage && (
            <div>
              <dt className="text-xs text-text-secondary">Dosage</dt>
              <dd className="text-text-primary">{result.dosage}</dd>
            </div>
          )}
          {result.qtMechanism && (
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-text-secondary">QT Mechanism</dt>
              <dd><ExpandableText text={result.qtMechanism} className="text-text-primary" lines={1} /></dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${sourceBadgeStyle(result.source)}`}>
            {sourceLabel(result.source)}
          </span>
          {result.enrichment && result.enrichment.fdaTorsadesReports !== null && result.enrichment.fdaTorsadesReports > 0 && (
            <span className="inline-block rounded-md bg-risk-danger-bg px-2 py-0.5 text-xs font-medium text-risk-danger-text">
              {result.enrichment.fdaTorsadesReports} FDA TdP reports
            </span>
          )}
          {result.enrichment && result.enrichment.dataSources.length > 1 && (
            <span className="inline-block rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
              {result.enrichment.dataSources.length} data sources
            </span>
          )}
        </div>
      </div>

      {/* Combo risk */}
      {result.comboAnalysis && (
        <div className="rounded-2xl bg-surface-raised p-5 card-shadow">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Combination Risk
            </h3>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${comboColor(result.comboAnalysis.comboRiskLevel)}`}>
              {result.comboAnalysis.comboRiskLevel}
            </span>
          </div>
          <ExpandableText text={result.comboAnalysis.summary} className="mt-2 text-sm text-text-secondary leading-relaxed" />

          {result.comboAnalysis.interactions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Interactions
              </h4>
              <ul className="mt-1.5 space-y-2">
                {result.comboAnalysis.interactions.map((interaction, i) => (
                  <li key={i} className="rounded-xl bg-surface p-3 text-sm">
                    <p className="font-medium text-text-primary">
                      {interaction.drugA} + {interaction.drugB}
                    </p>
                    <ExpandableText text={interaction.mechanism} className="mt-0.5 text-text-secondary" lines={1} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.comboAnalysis.genotypeConsiderations && (
            <div className="mt-3 rounded-xl bg-brand-light p-3">
              <p className="text-[11px] font-semibold text-brand-deep uppercase tracking-wider">Genotype Note</p>
              <ExpandableText text={result.comboAnalysis.genotypeConsiderations} className="mt-0.5 text-sm text-brand-deep" />
            </div>
          )}
        </div>
      )}

      {/* Alternatives */}
      {result.comboAnalysis && result.comboAnalysis.alternatives.length > 0 && (
        <div className="rounded-2xl bg-surface-raised p-5 card-shadow">
          <h3 className="text-[15px] font-semibold text-text-primary">
            Safer Alternatives
          </h3>
          <ul className="mt-2 space-y-2">
            {result.comboAnalysis.alternatives.map((alt, i) => (
              <li key={i} className="rounded-xl bg-[#EAFBF0] p-3">
                <p className="font-medium text-[#1B7A34] capitalize">
                  {alt.genericName}
                </p>
                <p className="text-xs text-[#34C759]">{alt.drugClass}</p>
                <ExpandableText text={alt.whySafer} className="mt-1 text-sm text-[#1B7A34]" lines={1} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show to Doctor + Print */}
      {showActions && (
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover shadow-[0_4px_16px_rgba(52,120,246,0.2)]"
          >
            Show to Doctor
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `Drug Scan: ${result.genericName}`, url: window.location.href }).catch(() => {})
              } else {
                window.print()
              }
            }}
            className="rounded-xl border-[1.5px] border-separator px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:border-brand hover:text-brand"
          >
            Share
          </button>
        </div>
      )}
    </div>
  )
}

function PipelineStepList({ steps, animate = false }: { steps: PipelineStep[]; animate?: boolean }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 relative ${animate ? 'animate-[fadeSlideIn_0.3s_ease-out_both]' : ''}`}
          style={animate ? { animationDelay: `${i * 60}ms` } : undefined}
        >
          {i < steps.length - 1 && (
            <div className="absolute left-[9px] top-[22px] bottom-0 w-px bg-neutral-200" />
          )}
          <div className="relative z-10 mt-[5px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white">
            {step.status === 'HIT' && (
              <div className="h-[18px] w-[18px] rounded-full bg-risk-safe-bg flex items-center justify-center">
                <span className="text-[11px] text-risk-safe-text">&#10003;</span>
              </div>
            )}
            {step.status === 'MISS' && (
              <div className="h-[18px] w-[18px] rounded-full bg-surface flex items-center justify-center">
                <span className="text-[11px] text-text-tertiary">&mdash;</span>
              </div>
            )}
            {step.status === 'SKIPPED' && (
              <div className="h-[18px] w-[18px] rounded-full bg-surface flex items-center justify-center">
                <span className="text-[10px] text-text-tertiary">&#8226;</span>
              </div>
            )}
            {step.status === 'ERROR' && (
              <div className="h-[18px] w-[18px] rounded-full bg-risk-danger-bg flex items-center justify-center">
                <span className="text-[11px] text-risk-danger-text">&#10005;</span>
              </div>
            )}
          </div>
          <div className="flex-1 pb-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-primary">{step.name}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                step.status === 'HIT'
                  ? 'bg-risk-safe-bg text-risk-safe-text'
                  : step.status === 'ERROR'
                    ? 'bg-risk-danger-bg text-risk-danger-text'
                    : 'bg-surface text-text-secondary'
              }`}>{step.status}</span>
              <span className="font-mono text-[10px] text-text-tertiary">
                {step.durationMs > 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
              </span>
            </div>
            {step.detail && (
              <p className="mt-0.5 text-[11px] text-text-secondary leading-tight">
                {step.detail}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function stepStatusIcon(status: PipelineStepStatus) {
  switch (status) {
    case 'HIT':
      return <span className="text-risk-safe">&#10003;</span>
    case 'MISS':
      return <span className="text-text-tertiary">&mdash;</span>
    case 'SKIPPED':
      return <span className="text-text-tertiary">&#8226;</span>
    case 'ERROR':
      return <span className="text-risk-danger">&#10005;</span>
  }
}

function stepStatusColor(status: PipelineStepStatus) {
  switch (status) {
    case 'HIT':
      return 'border-risk-safe/20'
    case 'ERROR':
      return 'border-risk-danger/20'
    default:
      return 'border-separator-light'
  }
}

function CompletedPipelineView({ steps: rawSteps }: { steps: PipelineStep[] }) {
  const steps = rawSteps.filter((s) => !HIDDEN_PIPELINE_STEPS.has(s.name))
  const [open, setOpen] = useState(false)
  const hitCount = steps.filter((s) => s.status === 'HIT').length
  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0)

  return (
    <div className="rounded-xl border border-separator-light bg-surface-raised print:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-medium text-text-primary">
            How we verified this
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            {hitCount}/{steps.length} sources &middot; {totalMs > 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`}
          </span>
          <svg
            className={`h-4 w-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
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
        <div className="border-t border-separator-light px-4 pb-4 pt-3">
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
                    <span className="text-xs font-semibold text-text-primary">
                      {step.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        step.status === 'HIT'
                          ? 'bg-risk-safe-bg text-risk-safe-text'
                          : step.status === 'ERROR'
                            ? 'bg-risk-danger-bg text-risk-danger-text'
                            : 'bg-surface text-text-secondary'
                      }`}>
                        {step.status}
                      </span>
                      <span className="font-mono text-[10px] text-text-tertiary">
                        {step.durationMs > 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
                      </span>
                    </div>
                  </div>
                  {step.detail && (
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-text-tertiary">
            Pipeline: Local DB &rarr; Fuzzy Match &rarr; RxNorm &rarr; CredibleMeds &rarr; FDA FAERS &rarr; AI Analysis
          </p>
        </div>
      )}
    </div>
  )
}

function Disclaimer() {
  return (
    <p className="text-xs text-text-tertiary print:text-text-secondary">
      This tool provides medication safety information only. It is not a substitute for
      professional medical advice. Always consult your cardiologist or prescribing physician
      before making medication changes. Data sourced from CredibleMeds and AI analysis.
    </p>
  )
}

// ── History constants ────────────────────────────────────────────────

const HIST_RISK_DOT: Record<string, string> = {
  KNOWN_RISK: 'bg-[#FF3B30]',
  POSSIBLE_RISK: 'bg-[#FF9F0A]',
  CONDITIONAL_RISK: 'bg-[#FF9F0A]',
  NOT_LISTED: 'bg-[#34C759]',
}

const HIST_RISK_LABEL: Record<string, string> = {
  KNOWN_RISK: 'Known Risk',
  POSSIBLE_RISK: 'Possible Risk',
  CONDITIONAL_RISK: 'Conditional',
  NOT_LISTED: 'Safe',
}

const HIST_RISK_TEXT: Record<string, string> = {
  KNOWN_RISK: 'text-[#C41E16]',
  POSSIBLE_RISK: 'text-[#8A5600]',
  CONDITIONAL_RISK: 'text-[#8A5600]',
  NOT_LISTED: 'text-[#1B7A34]',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function ScanHistory({ onSelect }: { onSelect: (entry: ScanHistoryEntry) => void }) {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scan/history')
      .then((r) => r.json())
      .then((data) => { setHistory(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mt-6 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="mt-8 text-center">
        <svg className="w-10 h-10 text-text-tertiary mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-text-secondary">No scans yet</p>
        <p className="text-xs text-text-tertiary mt-0.5">Search for a medication above to get started</p>
      </div>
    )
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Recent Scans</h2>
        <span className="text-xs text-text-tertiary">{history.length} scan{history.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-1.5">
        {history.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface-raised hover:bg-surface transition-colors text-left group"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${HIST_RISK_DOT[entry.riskCategory] ?? 'bg-text-tertiary'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate capitalize">
                {entry.genericName || entry.drugName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs font-medium ${HIST_RISK_TEXT[entry.riskCategory] ?? 'text-text-secondary'}`}>
                  {HIST_RISK_LABEL[entry.riskCategory] ?? entry.riskCategory}
                </span>
                {entry.comboRisk && (
                  <span className="text-[10px] text-text-tertiary">· Combo: {entry.comboRisk}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-text-tertiary">{timeAgo(entry.createdAt)}</span>
              <svg className="w-3.5 h-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

const FREQUENCY_PERIODS = ['day', 'week', 'month'] as const

function formatFrequency(times: string, period: string): string {
  if (!times || !period) return ''
  const n = parseInt(times, 10)
  if (!n || n < 1) return ''
  return `${n}x/${period}`
}

function AddToMedications({ result, onAdded }: { result: ScanResult; onAdded: () => void }) {
  const { addMedication } = useMedications()
  const [dosage, setDosage] = useState(result.dosage ?? '')
  const [freqTimes, setFreqTimes] = useState('')
  const [freqPeriod, setFreqPeriod] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const frequency = formatFrequency(freqTimes, freqPeriod)
    try {
      await addMedication({
        drugName: result.genericName,
        dosage: dosage.trim() || undefined,
        frequency: frequency || undefined,
      })
      setSaved(true)
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400">&#10003;</span>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 capitalize">
            {result.genericName} added to your medications
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 print:hidden">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Add to My Medications
      </h3>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Save this medication so HeartGuard checks future scans against it.
      </p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Dosage
          </label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 500mg"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Frequency
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="99"
              value={freqTimes}
              onChange={(e) => setFreqTimes(e.target.value)}
              placeholder="e.g. 2"
              className="w-16 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <span className="flex items-center text-sm text-neutral-400">per</span>
            <select
              value={freqPeriod}
              onChange={(e) => setFreqPeriod(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">...</option>
              {FREQUENCY_PERIODS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {saving ? 'Adding...' : 'Add to My Medications'}
      </button>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────

export function ScanPage() {
  const { result, photoResult, loading: scanLoading, error, liveSteps, scanByText, scanByPhoto, reset } = useDrugScan()
  const [query, setQuery] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [historyResult, setHistoryResult] = useState<ScanResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleScan = useCallback(
    (drugName: string) => {
      if (!drugName.trim()) return
      setHistoryResult(null)
      scanByText(drugName.trim())
    },
    [scanByText],
  )

  const handlePhotoCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setPhotoError(null)
      setHistoryResult(null)

      if (file.size > 10 * 1024 * 1024) {
        setPhotoError('Image is too large (max 10MB). Please use a smaller photo.')
        e.target.value = ''
        return
      }

      setPhotoPreview(URL.createObjectURL(file))
      try {
        const base64 = await readFileAsBase64(file)
        scanByPhoto(base64)
      } catch {
        setPhotoError('Could not read image. Please try again or type the medication name.')
        setPhotoPreview(null)
      }
      e.target.value = ''
    },
    [scanByPhoto],
  )

  const hasResult = result !== null || photoResult !== null

  const handleHistorySelect = useCallback((entry: ScanHistoryEntry) => {
    if (entry.fullResult) {
      setHistoryResult(entry.fullResult)
    } else {
      // Re-scan if no stored result
      scanByText(entry.genericName || entry.drugName)
    }
  }, [scanByText])

  const showingResult = hasResult || historyResult !== null
  const displayedResult = result ?? historyResult

  const handleNewScanWithHistory = useCallback(() => {
    reset()
    setHistoryResult(null)
    setResetSignal((n) => n + 1)
    setPhotoPreview(null)
    inputRef.current?.focus()
  }, [reset])

  return (
    <div className="mx-auto max-w-lg px-3 md:px-4">
      {/* Header */}
      <div className="mb-4 print:hidden">
        <h1 className="text-xl font-semibold text-text-primary">
          Scan Medication
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Check if a medication is safe for Long QT Syndrome
        </p>
      </div>

      {/* Search + Camera */}
      <div className="relative print:hidden">
        <div className="flex gap-2">
          <DrugSearchInput
            onSelect={(s) => handleScan(s.genericName)}
            onSubmit={handleScan}
            onQueryChange={(q) => { setQuery(q); if (hasResult) reset() }}
            disabled={scanLoading}
            inputRef={inputRef}
            resetSignal={resetSignal}
          />

          {/* Scan button */}
          <button
            type="button"
            onClick={() => handleScan(query)}
            disabled={scanLoading || !query.trim()}
            className="h-12 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
          >
            Scan
          </button>

          {/* Camera button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanLoading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-separator text-text-secondary transition-colors hover:bg-surface hover:border-brand hover:text-brand disabled:opacity-40"
            aria-label="Take photo of medication"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
        </div>

      </div>

      {/* Scan history — shown when idle (no result, not loading, no error) */}
      {!showingResult && !scanLoading && !error && !photoPreview && (
        <ScanHistory onSelect={handleHistorySelect} />
      )}

      {/* Live pipeline tracker — shown during scanning */}
      {scanLoading && <LivePipelineTracker steps={liveSteps} loading />}

      {/* Error with any pipeline steps that were collected */}
      {error && (
        <>
          {liveSteps.length > 0 && <LivePipelineTracker steps={liveSteps} loading={false} />}
          <div className="mt-6 rounded-2xl border border-[#FF3B30]/20 bg-[#FFEDEC] p-4">
            <p className="text-sm font-medium text-[#C41E16]">{error}</p>
            <button
              type="button"
              onClick={handleNewScanWithHistory}
              className="mt-2 text-sm font-medium text-[#FF3B30] underline hover:text-[#C41E16]"
            >
              Try again
            </button>
          </div>
        </>
      )}

      {/* Text scan result (from live scan or history) */}
      {displayedResult && (
        <div className="mt-6 space-y-4">
          {displayedResult.pipelineTrace && displayedResult.pipelineTrace.length > 0 && (
            <CompletedPipelineView steps={displayedResult.pipelineTrace} />
          )}
          <ResultCard result={displayedResult} />
          <AddToMedications result={displayedResult} onAdded={() => {}} />
          <Disclaimer />
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && (scanLoading || photoResult || photoError) && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900 print:hidden">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Uploaded image</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt="Uploaded medication photo"
            className="w-full max-h-48 rounded-lg object-contain bg-neutral-50 dark:bg-neutral-800"
          />
        </div>
      )}

      {/* Photo error */}
      {photoError && (
        <div className="mt-6 rounded-2xl border border-[#FF3B30]/20 bg-[#FFEDEC] p-4">
          <p className="text-sm font-medium text-[#C41E16]">{photoError}</p>
          <button
            type="button"
            onClick={() => { setPhotoError(null); setPhotoPreview(null); fileInputRef.current?.click() }}
            className="mt-2 text-sm font-medium text-[#FF3B30] underline hover:text-[#C41E16]"
          >
            Try another photo
          </button>
        </div>
      )}

      {/* Photo scan results */}
      {photoResult && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-surface-raised p-4 card-shadow">
            <p className="text-sm text-text-secondary">
              Detected <strong className="text-text-primary">{photoResult.detectedDrugNames.length}</strong> medication{photoResult.detectedDrugNames.length !== 1 ? 's' : ''} from photo
            </p>
            {photoResult.unrecognizedText.length > 0 && (
              <p className="mt-1 text-xs text-text-tertiary">
                Could not analyze: {photoResult.unrecognizedText.join(', ')}
              </p>
            )}
          </div>
          {photoResult.scanResults.map((scanResult, i) => (
            <div key={i} className="space-y-3">
              {scanResult.pipelineTrace && scanResult.pipelineTrace.length > 0 && (
                <CompletedPipelineView steps={scanResult.pipelineTrace} />
              )}
              <ResultCard result={scanResult} showActions={i === photoResult.scanResults.length - 1} />
              <AddToMedications result={scanResult} onAdded={() => {}} />
            </div>
          ))}
          <Disclaimer />
        </div>
      )}

      {/* New scan button when result is shown */}
      {showingResult && (
        <div className="mt-4 print:hidden">
          <button
            type="button"
            onClick={handleNewScanWithHistory}
            className="w-full rounded-xl border-[1.5px] border-separator py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:border-brand hover:text-brand"
          >
            Scan Another Medication
          </button>
        </div>
      )}
    </div>
  )
}
