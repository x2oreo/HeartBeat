'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Genotype, ScanResult, PipelineStep, PipelineStepStatus, ComboRiskLevel, RiskCategory } from '@/types'
import PhoneInput from '@/components/PhoneInput'
import { parseE164, validateNationalNumber } from '@/lib/phone-countries'
import { DrugSearchInput } from '@/components/shared/DrugSearchInput'
import { useDrugScan } from '@/hooks/use-drug-scan'

// ── Types ───────────────────────────────────────────────────────────

type ContactEntry = {
  firstName: string
  lastName: string
  phone: string
  relationship: string
  errors: { firstName?: string; lastName?: string; phone?: string }
}

// ── Constants ───────────────────────────────────────────────────────

const GENOTYPE_OPTIONS: { value: Genotype; label: string; description: string }[] = [
  { value: 'LQT1', label: 'LQT1', description: 'Triggered by exercise and swimming' },
  { value: 'LQT2', label: 'LQT2', description: 'Triggered by sudden noises and emotional stress' },
  { value: 'LQT3', label: 'LQT3', description: 'Events occur during sleep or rest' },
]

const RELATIONSHIP_OPTIONS = ['Cardiologist', 'Family', 'Friend']

const FREQUENCY_PERIODS = ['day', 'week', 'month', 'once in a while'] as const

const RISK_CONFIG: Record<RiskCategory, { dot: string; badge: string; label: string }> = {
  KNOWN_RISK:       { dot: 'bg-[#FF3B30]', badge: 'bg-[#FFEDEC] text-[#C41E16]',   label: 'Known Risk' },
  POSSIBLE_RISK:    { dot: 'bg-[#FF9F0A]', badge: 'bg-[#FFF5E0] text-[#8A5600]',   label: 'Possible Risk' },
  CONDITIONAL_RISK: { dot: 'bg-[#FF9F0A]', badge: 'bg-[#FFF5E0] text-[#8A5600]',   label: 'Conditional' },
  NOT_LISTED:       { dot: 'bg-[#34C759]', badge: 'bg-[#EAFBF0] text-[#1B7A34]',   label: 'Not Listed' },
}

// ── Helpers ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              step === current
                ? 'bg-brand text-white'
                : step < current
                  ? 'bg-brand-light text-brand-deep'
                  : 'bg-separator-light text-text-tertiary'
            }`}
          >
            {step < current ? '✓' : step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-0.5 ${
                step < current ? 'bg-brand' : 'bg-separator-light'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function riskColor(category: RiskCategory, isDTA: boolean) {
  if (category === 'KNOWN_RISK' || isDTA)
    return {
      bg: 'bg-[#FFEDEC]',
      border: 'border-[#FF3B30]/20',
      text: 'text-[#C41E16]',
      icon: 'text-[#FF3B30]',
    }
  if (category === 'POSSIBLE_RISK' || category === 'CONDITIONAL_RISK')
    return {
      bg: 'bg-[#FFF5E0]',
      border: 'border-[#FF9F0A]/20',
      text: 'text-[#8A5600]',
      icon: 'text-[#FF9F0A]',
    }
  return {
    bg: 'bg-[#EAFBF0]',
    border: 'border-[#34C759]/20',
    text: 'text-[#1B7A34]',
    icon: 'text-[#34C759]',
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
  if (level === 'CRITICAL' || level === 'HIGH') return 'bg-[#FFEDEC] text-[#C41E16]'
  if (level === 'MEDIUM') return 'bg-[#FFF5E0] text-[#8A5600]'
  return 'bg-[#EAFBF0] text-[#1B7A34]'
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

function formatFrequency(times: string, period: string): string {
  if (!period) return ''
  if (period === 'once in a while') return 'once in a while'
  if (!times) return ''
  const n = parseInt(times, 10)
  if (!n || n < 1) return ''
  return `${n}x/${period}`
}

// ── Scan Sub-components (matching ScanPage 1:1) ─────────────────────

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-500" />
  )
}

function ExpandableText({ text, className, lines = 2 }: { text: string; className?: string; lines?: number }) {
  const [expanded, setExpanded] = useState(false)
  const clampClass = lines === 2 ? 'line-clamp-2' : lines === 3 ? 'line-clamp-3' : 'line-clamp-1'
  const isLong = text.length > 100

  if (!isLong) return <p className={className ?? ''}>{text}</p>

  return (
    <div>
      <p className={`${className ?? ''} ${expanded ? '' : clampClass}`}>{text}</p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-600"
      >
        {expanded ? 'Read less' : 'Read more'}
        <svg className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
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
            <StepStatusDot status={step.status} />
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
              <p className="mt-0.5 text-[11px] text-text-secondary leading-tight">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function StepStatusDot({ status }: { status: PipelineStepStatus }) {
  if (status === 'HIT') return (
    <div className="h-[18px] w-[18px] rounded-full bg-risk-safe-bg flex items-center justify-center">
      <span className="text-[11px] text-risk-safe-text">&#10003;</span>
    </div>
  )
  if (status === 'MISS') return (
    <div className="h-[18px] w-[18px] rounded-full bg-surface flex items-center justify-center">
      <span className="text-[11px] text-text-tertiary">&mdash;</span>
    </div>
  )
  if (status === 'ERROR') return (
    <div className="h-[18px] w-[18px] rounded-full bg-risk-danger-bg flex items-center justify-center">
      <span className="text-[11px] text-risk-danger-text">&#10005;</span>
    </div>
  )
  return (
    <div className="h-[18px] w-[18px] rounded-full bg-surface flex items-center justify-center">
      <span className="text-[10px] text-text-tertiary">&#8226;</span>
    </div>
  )
}

function LivePipelineTracker({ steps, loading }: { steps: PipelineStep[]; loading: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0)

  // Progressively reveal steps
  if (steps.length > 0 && visibleCount < steps.length) {
    setTimeout(() => setVisibleCount((c) => c + 1), 200)
  }

  const visibleSteps = steps.slice(0, visibleCount)
  const stillRevealing = visibleCount < steps.length

  if (steps.length === 0 && !loading) return null

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        {(loading || stillRevealing) && <Spinner />}
        {!loading && !stillRevealing && (
          <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-[10px] text-emerald-600">&#10003;</span>
          </div>
        )}
        <h3 className="text-sm font-semibold text-neutral-900">
          {loading || stillRevealing ? 'Analyzing medication...' : 'Verification complete'}
        </h3>
      </div>
      <PipelineStepList steps={visibleSteps} animate />
      {(loading || stillRevealing) && (
        <div className="flex items-center gap-3 mt-1">
          <div className="relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
            <Spinner />
          </div>
          <span className="text-xs text-neutral-400 animate-pulse">
            {stillRevealing ? steps[visibleCount]?.name ?? 'Processing...' : 'Processing...'}
          </span>
        </div>
      )}
    </div>
  )
}

function CompletedPipelineView({ steps }: { steps: PipelineStep[] }) {
  const [open, setOpen] = useState(false)
  const hitCount = steps.filter((s) => s.status === 'HIT').length
  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0)

  return (
    <div className="rounded-xl border border-separator-light bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-medium text-text-primary">How we verified this</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            {hitCount}/{steps.length} sources &middot; {totalMs > 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`}
          </span>
          <svg className={`h-4 w-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-separator-light px-4 pb-4 pt-3">
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                step.status === 'HIT' ? 'border-risk-safe/20' : step.status === 'ERROR' ? 'border-risk-danger/20' : 'border-separator-light'
              }`}>
                <div className="mt-0.5 w-5 text-center text-sm font-bold leading-none">
                  <StepStatusIcon status={step.status} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-primary">{step.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        step.status === 'HIT' ? 'bg-risk-safe-bg text-risk-safe-text' : step.status === 'ERROR' ? 'bg-risk-danger-bg text-risk-danger-text' : 'bg-surface text-text-secondary'
                      }`}>{step.status}</span>
                      <span className="font-mono text-[10px] text-text-tertiary">
                        {step.durationMs > 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
                      </span>
                    </div>
                  </div>
                  {step.detail && <p className="mt-0.5 text-[11px] text-text-secondary">{step.detail}</p>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-text-tertiary">
            Pipeline: Local DB &rarr; Fuzzy Match &rarr; BG Database &rarr; AI Analysis
          </p>
        </div>
      )}
    </div>
  )
}

function StepStatusIcon({ status }: { status: PipelineStepStatus }) {
  if (status === 'HIT') return <span className="text-risk-safe">&#10003;</span>
  if (status === 'MISS') return <span className="text-text-tertiary">&mdash;</span>
  if (status === 'ERROR') return <span className="text-risk-danger">&#10005;</span>
  return <span className="text-text-tertiary">&#8226;</span>
}

function OnboardingResultCard({ result }: { result: ScanResult }) {
  const colors = riskColor(result.riskCategory, result.isDTA)
  const headline = riskHeadline(result.riskCategory, result.isDTA)

  return (
    <div className="space-y-4">
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
        <h3 className="text-[15px] font-semibold text-text-primary capitalize">{result.genericName}</h3>
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
            <h3 className="text-[15px] font-semibold text-text-primary">Combination Risk</h3>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${comboColor(result.comboAnalysis.comboRiskLevel)}`}>
              {result.comboAnalysis.comboRiskLevel}
            </span>
          </div>
          <ExpandableText text={result.comboAnalysis.summary} className="mt-2 text-sm text-text-secondary leading-relaxed" />

          {result.comboAnalysis.interactions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Interactions</h4>
              <ul className="mt-1.5 space-y-2">
                {result.comboAnalysis.interactions.map((interaction, i) => (
                  <li key={i} className="rounded-xl bg-surface p-3 text-sm">
                    <p className="font-medium text-text-primary">{interaction.drugA} + {interaction.drugB}</p>
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
          <h3 className="text-[15px] font-semibold text-text-primary">Safer Alternatives</h3>
          <ul className="mt-2 space-y-2">
            {result.comboAnalysis.alternatives.map((alt, i) => (
              <li key={i} className="rounded-xl bg-[#EAFBF0] p-3">
                <p className="font-medium text-[#1B7A34] capitalize">{alt.genericName}</p>
                <p className="text-xs text-[#34C759]">{alt.drugClass}</p>
                <ExpandableText text={alt.whySafer} className="mt-1 text-sm text-[#1B7A34]" lines={1} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AddToMedicationsOnboarding({ result, onAdded }: { result: ScanResult; onAdded: (med: SavedMed) => void }) {
  const [dosage, setDosage] = useState(result.dosage ?? '1')
  const [freqTimes, setFreqTimes] = useState('1')
  const [freqPeriod, setFreqPeriod] = useState<string>('once in a while')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const frequency = formatFrequency(freqTimes, freqPeriod)
    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugName: result.genericName,
          dosage: dosage.trim() || undefined,
          frequency: frequency || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Failed to add medication')
      }
      const med: SavedMed = await res.json()
      setSaved(true)
      onAdded(med)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600">&#10003;</span>
          <p className="text-sm font-medium text-emerald-700 capitalize">
            {result.genericName} added to your medications
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-separator-light bg-surface-raised p-4">
      <h3 className="text-sm font-semibold text-text-primary">Add to My Medications</h3>
      <p className="mt-1 text-xs text-text-secondary">
        Save this medication so QTShield checks future scans against it.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Dosage</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 500mg"
            className="w-full rounded-xl border-[1.5px] border-separator bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Frequency</label>
          <div className="flex gap-2">
            {freqPeriod !== 'once in a while' && (
              <>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={freqTimes}
                  onChange={(e) => setFreqTimes(e.target.value)}
                  placeholder="2"
                  className="w-16 rounded-xl border-[1.5px] border-separator bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
                />
                <span className="flex items-center text-sm text-text-tertiary">per</span>
              </>
            )}
            <select
              value={freqPeriod}
              onChange={(e) => setFreqPeriod(e.target.value)}
              className="flex-1 rounded-xl border-[1.5px] border-separator bg-surface-raised px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
            >
              <option value="">...</option>
              {FREQUENCY_PERIODS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-[#FF3B30]">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !formatFrequency(freqTimes, freqPeriod)}
        className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
      >
        {saving ? 'Adding...' : 'Add to My Medications'}
      </button>
    </div>
  )
}

// ── Medication Scan Step ─────────────────────────────────────────────

type SavedMed = {
  id: string
  genericName: string
  qtRisk: RiskCategory
  isDTA: boolean
  dosage: string | null
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return reject(new Error('Failed to read file'))
      const base64 = result.split(',')[1]
      if (!base64) return reject(new Error('Empty file'))
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function MedicationScanStep({ onBack, onNext, savedMeds, setSavedMeds, medsLoaded }: {
  onBack: () => void
  onNext: () => void
  savedMeds: SavedMed[]
  setSavedMeds: React.Dispatch<React.SetStateAction<SavedMed[]>>
  medsLoaded: boolean
}) {
  const { result, photoResult, loading: scanLoading, error: scanError, liveSteps, scanByText, scanByPhoto, reset } = useDrugScan()
  const [query, setQuery] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScan = useCallback(
    (drugName: string) => {
      if (!drugName.trim()) return
      setPhotoPreview(null)
      setPhotoError(null)
      scanByText(drugName.trim())
    },
    [scanByText],
  )

  const handlePhotoCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setPhotoError(null)

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

  const handleNewScan = useCallback(() => {
    reset()
    setResetSignal((n) => n + 1)
    setPhotoPreview(null)
    setPhotoError(null)
    inputRef.current?.focus()
  }, [reset])

  const handleMedAdded = useCallback((med: SavedMed) => {
    setSavedMeds((prev) => [...prev, med])
    // After adding, reset scan so user can scan another
    setTimeout(() => {
      handleNewScan()
    }, 1500)
  }, [handleNewScan])

  async function handleRemove(id: string) {
    setRemoving(id)
    try {
      const res = await fetch('/api/medications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId: id }),
      })
      if (res.ok) {
        setSavedMeds((prev) => prev.filter((m) => m.id !== id))
      }
    } finally {
      setRemoving(null)
      setConfirmRemoveId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">
        What medications do you currently take?
      </h2>
      <p className="text-sm text-text-secondary">
        Scan each medication to check its safety profile and add it to your list.
      </p>

      {/* Search + Scan + Camera */}
      <div className="flex gap-2">
        <DrugSearchInput
          onSelect={(s) => handleScan(s.genericName)}
          onSubmit={handleScan}
          onQueryChange={(q) => { setQuery(q); if (result) reset() }}
          disabled={scanLoading}
          inputRef={inputRef}
          resetSignal={resetSignal}
        />
        <button
          type="button"
          onClick={() => handleScan(query)}
          disabled={scanLoading || !query.trim()}
          className="h-12 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
        >
          Scan
        </button>
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

      {/* Live pipeline tracker */}
      {scanLoading && <LivePipelineTracker steps={liveSteps} loading />}

      {/* Error */}
      {scanError && (
        <>
          {liveSteps.length > 0 && <LivePipelineTracker steps={liveSteps} loading={false} />}
          <div className="rounded-2xl border border-[#FF3B30]/20 bg-[#FFEDEC] p-4">
            <p className="text-sm font-medium text-[#C41E16]">{scanError}</p>
            <button
              type="button"
              onClick={handleNewScan}
              className="mt-2 text-sm font-medium text-[#FF3B30] underline hover:text-[#C41E16]"
            >
              Try again
            </button>
          </div>
        </>
      )}

      {/* Scan result */}
      {result && (
        <div className="space-y-4">
          {result.pipelineTrace && result.pipelineTrace.length > 0 && (
            <CompletedPipelineView steps={result.pipelineTrace} />
          )}
          <OnboardingResultCard result={result} />
          <AddToMedicationsOnboarding result={result} onAdded={handleMedAdded} />
          <button
            type="button"
            onClick={handleNewScan}
            className="w-full rounded-xl border-[1.5px] border-separator py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:border-brand hover:text-brand"
          >
            Scan Another Medication
          </button>
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && (scanLoading || photoResult || photoError) && (
        <div className="rounded-xl border border-separator-light bg-surface-raised p-3">
          <p className="text-xs font-medium text-text-secondary mb-2">Uploaded image</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt="Uploaded medication photo"
            className="w-full max-h-48 rounded-lg object-contain bg-surface"
          />
        </div>
      )}

      {/* Photo error */}
      {photoError && (
        <div className="rounded-2xl border border-[#FF3B30]/20 bg-[#FFEDEC] p-4">
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
        <div className="space-y-4">
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
              <OnboardingResultCard result={scanResult} />
              <AddToMedicationsOnboarding result={scanResult} onAdded={handleMedAdded} />
            </div>
          ))}
          <button
            type="button"
            onClick={handleNewScan}
            className="w-full rounded-xl border-[1.5px] border-separator py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:border-brand hover:text-brand"
          >
            Scan Another Medication
          </button>
        </div>
      )}

      {/* Added medications list */}
      {medsLoaded && savedMeds.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            Your Medications ({savedMeds.length})
          </h3>
          {savedMeds.map((med) => {
            const risk = RISK_CONFIG[med.qtRisk]
            const isConfirming = confirmRemoveId === med.id
            const isRemoving = removing === med.id

            return (
              <div key={med.id} className="flex items-center justify-between p-3 bg-surface-raised rounded-xl card-shadow">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${risk.dot}`} />
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary capitalize">{med.genericName}</span>
                    {med.dosage && <span className="text-xs text-text-secondary ml-2">{med.dosage}</span>}
                  </div>
                  <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${risk.badge}`}>
                    {risk.label}
                  </span>
                  {med.isDTA && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF3B30] text-white shrink-0">
                      DTA
                    </span>
                  )}
                </div>
                {isConfirming ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setConfirmRemoveId(null)} className="text-xs text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                    <button
                      onClick={() => handleRemove(med.id)}
                      disabled={isRemoving}
                      className="text-xs font-semibold text-[#FF3B30] hover:text-[#C41E16] transition-colors disabled:opacity-50"
                    >
                      {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(med.id)}
                    className="text-text-tertiary hover:text-[#FF3B30] transition-colors p-1 shrink-0"
                    aria-label={`Remove ${med.genericName}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-semibold text-text-secondary bg-separator-light hover:bg-separator transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-hover transition-colors"
        >
          Next
        </button>
      </div>
      {savedMeds.length === 0 && (
        <button
          type="button"
          onClick={onNext}
          className="w-full text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Skip — I don&apos;t take any medications
        </button>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [genotype, setGenotype] = useState<Genotype | null>(null)

  // Step 2 — lifted so state survives step changes
  const [savedMeds, setSavedMeds] = useState<SavedMed[]>([])
  const [medsLoaded, setMedsLoaded] = useState(false)
  const fetchedRef = useRef(false)
  if (!fetchedRef.current) {
    fetchedRef.current = true
    void fetch('/api/medications')
      .then((r) => r.ok ? r.json() : [])
      .then((data: SavedMed[]) => { setSavedMeds(data); setMedsLoaded(true) })
      .catch(() => setMedsLoaded(true))
  }

  // Step 3
  const [contacts, setContacts] = useState<ContactEntry[]>([
    { firstName: '', lastName: '', phone: '', relationship: 'Cardiologist', errors: {} },
  ])

  // ── Contacts ────────────────────────────────────────────────────

  function updateContact(index: number, field: 'firstName' | 'lastName' | 'phone' | 'relationship', value: string) {
    setContacts((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c
        const updated = { ...c, [field]: value }
        if (field === 'firstName' || field === 'lastName' || field === 'phone') {
          updated.errors = { ...c.errors, [field]: undefined }
        }
        return updated
      }),
    )
  }

  function addContact() {
    setContacts((prev) => [...prev, { firstName: '', lastName: '', phone: '', relationship: 'Family', errors: {} }])
  }

  function removeContact(index: number) {
    if (contacts.length <= 1) return
    setContacts((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Submit ──────────────────────────────────────────────────────

  async function handleSubmit() {
    setError(null)

    let hasErrors = false
    const validated = contacts.map((c) => {
      const errors: ContactEntry['errors'] = {}
      if (!c.firstName.trim()) { errors.firstName = 'First name is required'; hasErrors = true }
      if (!c.lastName.trim()) { errors.lastName = 'Last name is required'; hasErrors = true }
      const { country, nationalNumber } = parseE164(c.phone)
      const phoneError = validateNationalNumber(country, nationalNumber)
      if (phoneError) { errors.phone = phoneError; hasErrors = true }
      return { ...c, errors }
    })
    setContacts(validated)
    if (hasErrors) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genotype: genotype ?? 'UNKNOWN',
          emergencyContacts: validated.map((c) => ({
            name: `${c.firstName.trim()} ${c.lastName.trim()}`,
            phone: c.phone,
            relationship: c.relationship.toLowerCase(),
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Something went wrong')
      }

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-surface flex items-start justify-center px-4 py-8"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Set Up QTShield</h1>
          <p className="text-sm text-text-secondary mt-1">
            Personalize your medication safety profile
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Genotype ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              What is your LQTS type?
            </h2>
            <p className="text-sm text-text-secondary">
              This helps us tailor medication safety checks to your specific condition.
            </p>

            <div className="space-y-3">
              {GENOTYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGenotype(option.value)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    genotype === option.value
                      ? 'border-brand bg-brand-light'
                      : 'border-separator-light hover:border-separator'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">
                      {option.label}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        genotype === option.value
                          ? 'border-brand'
                          : 'border-separator'
                      }`}
                    >
                      {genotype === option.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-brand" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!genotype}
              className="w-full mt-4 py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* ── Step 2: Medications (Full Scan Experience) ──────── */}
        {step === 2 && (
          <MedicationScanStep onBack={() => setStep(1)} onNext={() => setStep(3)} savedMeds={savedMeds} setSavedMeds={setSavedMeds} medsLoaded={medsLoaded} />
        )}

        {/* ── Step 3: Emergency Contacts ───────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Add your cardiologist and a family member
            </h2>
            <p className="text-sm text-text-secondary">
              These contacts appear on your Emergency Card. At least one is required.
            </p>

            <div className="space-y-4">
              {contacts.map((contact, i) => (
                <div
                  key={i}
                  className="p-4 bg-surface-raised rounded-2xl card-shadow space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-secondary">
                      Contact {i + 1}
                    </span>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(i)}
                        className="text-text-tertiary hover:text-[#FF3B30] transition-colors text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={contact.firstName}
                        onChange={(e) => updateContact(i, 'firstName', e.target.value)}
                        placeholder="First name"
                        className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${
                          contact.errors.firstName
                            ? 'border-[#FF3B30]'
                            : 'border-separator'
                        }`}
                      />
                      {contact.errors.firstName && (
                        <p className="text-xs text-[#FF3B30] mt-1">{contact.errors.firstName}</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={contact.lastName}
                        onChange={(e) => updateContact(i, 'lastName', e.target.value)}
                        placeholder="Last name"
                        className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${
                          contact.errors.lastName
                            ? 'border-[#FF3B30]'
                            : 'border-separator'
                        }`}
                      />
                      {contact.errors.lastName && (
                        <p className="text-xs text-[#FF3B30] mt-1">{contact.errors.lastName}</p>
                      )}
                    </div>
                  </div>
                  <PhoneInput
                    value={contact.phone}
                    onChange={(val) => updateContact(i, 'phone', val)}
                    error={contact.errors.phone}
                  />
                  <select
                    value={contact.relationship}
                    onChange={(e) => updateContact(i, 'relationship', e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
                  >
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addContact}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-separator text-sm font-medium text-text-secondary hover:border-brand hover:text-brand transition-colors"
            >
              + Add another contact
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-[#FFEDEC] border border-[#FF3B30]/20 text-sm text-[#C41E16]">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl font-semibold text-text-secondary bg-separator-light hover:bg-separator disabled:opacity-40 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
