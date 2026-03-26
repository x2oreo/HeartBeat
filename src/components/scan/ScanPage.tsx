'use client'

import { useState, useRef, useCallback } from 'react'
import type { ScanResult, RiskCategory, ComboRiskLevel } from '@/types'
import { useDrugSearch } from '@/hooks/use-drug-search'
import type { DrugSuggestion } from '@/hooks/use-drug-search'
import { useDrugScan } from '@/hooks/use-drug-scan'

// ── Helpers ─────────────────────────────────────────────────────────

function riskColor(category: RiskCategory, isDTA: boolean) {
  if (category === 'KNOWN_RISK' || isDTA)
    return {
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300',
    }
  if (category === 'POSSIBLE_RISK' || category === 'CONDITIONAL_RISK')
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
    }
  return {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
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
    return 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'
  if (level === 'MEDIUM')
    return 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
  return 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
}

function suggestionRiskBadge(category: RiskCategory) {
  if (category === 'KNOWN_RISK')
    return <span className="ml-auto shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/60 dark:text-red-300">KNOWN RISK</span>
  if (category === 'POSSIBLE_RISK')
    return <span className="ml-auto shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">POSSIBLE RISK</span>
  if (category === 'CONDITIONAL_RISK')
    return <span className="ml-auto shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">CONDITIONAL</span>
  return null
}

async function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

// ── Components ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="mt-6 space-y-4 animate-pulse">
      <div className="h-28 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-5 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-5 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-40 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
    </div>
  )
}

function ResultCard({ result, showActions = true }: { result: ScanResult; showActions?: boolean }) {
  const colors = riskColor(result.riskCategory, result.isDTA)
  const headline = riskHeadline(result.riskCategory, result.isDTA)

  return (
    <div className="space-y-4">
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
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {result.genericName}
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">Drug Class</dt>
            <dd className="text-neutral-800 dark:text-neutral-200">{result.drugClass}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">Primary Use</dt>
            <dd className="text-neutral-800 dark:text-neutral-200">{result.primaryUse}</dd>
          </div>
          {result.qtMechanism && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-neutral-500 dark:text-neutral-400">QT Mechanism</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{result.qtMechanism}</dd>
            </div>
          )}
        </dl>
        <div className="mt-3">
          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${colors.badge}`}>
            {result.source === 'CREDIBLEMEDS_VERIFIED' ? 'Verified by CredibleMeds' : 'AI Assessment'}
          </span>
        </div>
      </div>

      {/* Combo risk */}
      {result.comboAnalysis && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Combination Risk
            </h3>
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${comboColor(result.comboAnalysis.comboRiskLevel)}`}>
              {result.comboAnalysis.comboRiskLevel}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
            {result.comboAnalysis.summary}
          </p>

          {result.comboAnalysis.interactions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Interactions
              </h4>
              <ul className="mt-1.5 space-y-2">
                {result.comboAnalysis.interactions.map((interaction, i) => (
                  <li key={i} className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800/50">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {interaction.drugA} + {interaction.drugB}
                    </p>
                    <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
                      {interaction.mechanism}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.comboAnalysis.genotypeConsiderations && (
            <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Genotype Note</p>
              <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-300">
                {result.comboAnalysis.genotypeConsiderations}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Alternatives */}
      {result.comboAnalysis && result.comboAnalysis.alternatives.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Safer Alternatives
          </h3>
          <ul className="mt-2 space-y-2">
            {result.comboAnalysis.alternatives.map((alt, i) => (
              <li key={i} className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  {alt.genericName}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{alt.drugClass}</p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
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
            className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
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
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Share
          </button>
        </div>
      )}
    </div>
  )
}

function Disclaimer() {
  return (
    <p className="text-xs text-neutral-400 dark:text-neutral-500 print:text-neutral-600">
      This tool provides medication safety information only. It is not a substitute for
      professional medical advice. Always consult your cardiologist or prescribing physician
      before making medication changes. Data sourced from CredibleMeds and AI analysis.
    </p>
  )
}

// ── Main Page ───────────────────────────────────────────────────────

export function ScanPage() {
  const { query, setQuery, suggestions, loading: searchLoading } = useDrugSearch()
  const { result, photoResult, loading: scanLoading, error, scanByText, scanByPhoto, reset } = useDrugScan()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleScan = useCallback(
    (drugName: string) => {
      if (!drugName.trim()) return
      setShowSuggestions(false)
      scanByText(drugName.trim())
    },
    [scanByText],
  )

  const handleSelectSuggestion = useCallback(
    (suggestion: DrugSuggestion) => {
      setQuery(suggestion.genericName)
      setShowSuggestions(false)
      scanByText(suggestion.genericName)
    },
    [setQuery, scanByText],
  )

  const handlePhotoCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        setPhotoError(null)
        const base64 = await resizeImage(file, 1024)
        scanByPhoto(base64)
      } catch {
        setPhotoError('Could not process image. Please try again or type the medication name.')
      }
      // Reset the input so the same file can be selected again
      e.target.value = ''
    },
    [scanByPhoto],
  )

  const handleNewScan = useCallback(() => {
    reset()
    setQuery('')
    inputRef.current?.focus()
  }, [reset, setQuery])

  const hasResult = result !== null || photoResult !== null

  return (
    <div className="mx-auto max-w-lg px-1">
      {/* Header */}
      <div className="mb-4 print:hidden">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Scan Medication
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          Check if a medication is safe for Long QT Syndrome
        </p>
      </div>

      {/* Search + Camera */}
      <div className="relative print:hidden">
        <div className="flex gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchLoading && (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search medication name..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowSuggestions(true)
                if (hasResult) reset()
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow dropdown item click to fire first
                setTimeout(() => setShowSuggestions(false), 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleScan(query)
                if (e.key === 'Escape') setShowSuggestions(false)
              }}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-600"
              disabled={scanLoading}
            />

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && !scanLoading && (
              <ul
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                onMouseDown={(e) => e.preventDefault()}
              >
                {suggestions.map((s) => (
                  <li key={s.genericName}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {s.genericName}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {s.drugClass}
                          {s.brandNames.length > 0 && ` · ${s.brandNames.join(', ')}`}
                        </p>
                      </div>
                      {suggestionRiskBadge(s.riskCategory)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Scan button */}
          <button
            type="button"
            onClick={() => handleScan(query)}
            disabled={scanLoading || !query.trim()}
            className="h-12 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Scan
          </button>

          {/* Camera button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanLoading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
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
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
        </div>

      </div>

      {/* Scan loading */}
      {scanLoading && <LoadingSkeleton />}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={handleNewScan}
            className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-500 dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      {/* Text scan result */}
      {result && (
        <div className="mt-6 space-y-4">
          <ResultCard result={result} />
          <Disclaimer />
        </div>
      )}

      {/* Photo error */}
      {photoError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{photoError}</p>
        </div>
      )}

      {/* Photo scan results */}
      {photoResult && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Detected <strong>{photoResult.detectedDrugNames.length}</strong> medication{photoResult.detectedDrugNames.length !== 1 ? 's' : ''} from photo
            </p>
            {photoResult.unrecognizedText.length > 0 && (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Could not analyze: {photoResult.unrecognizedText.join(', ')}
              </p>
            )}
          </div>
          {photoResult.scanResults.map((scanResult, i) => (
            <ResultCard key={i} result={scanResult} showActions={i === photoResult.scanResults.length - 1} />
          ))}
          <Disclaimer />
        </div>
      )}

      {/* New scan button when result is shown */}
      {hasResult && (
        <div className="mt-4 print:hidden">
          <button
            type="button"
            onClick={handleNewScan}
            className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Scan Another Medication
          </button>
        </div>
      )}
    </div>
  )
}
