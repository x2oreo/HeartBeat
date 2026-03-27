'use client'

import type { ScanResult } from '@/types'
import { riskColor, riskHeadline, comboColor, sourceLabel, sourceBadgeStyle } from '@/lib/risk-utils'

export function ResultCard({ result, showActions = true, compact = false }: {
  result: ScanResult
  showActions?: boolean
  compact?: boolean
}) {
  const colors = riskColor(result.riskCategory, result.isDTA)
  const headline = riskHeadline(result.riskCategory, result.isDTA)

  return (
    <div className="space-y-4">
      {/* Fuzzy match banner */}
      {result.fuzzyMatch && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-700">
            Showing results for <strong>{result.fuzzyMatch.matchedName}</strong>
            {result.fuzzyMatch.originalQuery !== result.fuzzyMatch.matchedName && (
              <> (you searched for &ldquo;{result.fuzzyMatch.originalQuery}&rdquo;)</>
            )}
          </p>
        </div>
      )}

      {/* AI-only warning */}
      {result.source === 'AI_ASSESSED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-700">
            This drug was not found in any verified medical database. This assessment is based on AI analysis only. Please consult your cardiologist.
          </p>
        </div>
      )}

      {/* Main risk card */}
      <div className={`rounded-2xl border-2 ${compact ? 'p-3.5' : 'p-5'} ${colors.bg} ${colors.border}`}>
        <div className="flex items-start gap-3">
          <span className={`${compact ? 'text-2xl' : 'text-3xl'} leading-none ${colors.icon}`}>{headline.icon}</span>
          <div>
            <p className={`${compact ? 'text-[15px]' : 'text-lg'} font-semibold ${colors.text}`}>{headline.text}</p>
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
        <h3 className="text-[15px] font-semibold text-text-primary">
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
              <dt className="text-[13px] text-text-secondary">Dosage</dt>
              <dd className="text-text-primary">{result.dosage}</dd>
            </div>
          )}
          {result.qtMechanism && !compact && (
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-text-secondary">QT Mechanism</dt>
              <dd className="text-text-primary">{result.qtMechanism}</dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${sourceBadgeStyle(result.source)}`}>
            {sourceLabel(result.source)}
          </span>
          {result.enrichment && result.enrichment.fdaTorsadesReports !== null && result.enrichment.fdaTorsadesReports > 0 && (
            <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {result.enrichment.fdaTorsadesReports} FDA TdP reports
            </span>
          )}
          {result.enrichment && result.enrichment.dataSources.length > 1 && (
            <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
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
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {result.comboAnalysis.summary}
          </p>

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
                    <p className="mt-0.5 text-text-secondary">
                      {interaction.mechanism}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.comboAnalysis.genotypeConsiderations && (
            <div className="mt-3 rounded-xl bg-brand-light p-3">
              <p className="text-[11px] font-semibold text-brand-deep uppercase tracking-wider">Genotype Note</p>
              <p className="mt-0.5 text-sm text-brand-deep">
                {result.comboAnalysis.genotypeConsiderations}
              </p>
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
                <p className="font-medium text-[#1B7A34]">
                  {alt.genericName}
                </p>
                <p className="text-xs text-[#34C759]">{alt.drugClass}</p>
                <p className="mt-1 text-sm text-[#1B7A34]">
                  {alt.whySafer}
                </p>
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
