'use client'

import { useState, useRef, useCallback } from 'react'
import type { RiskCategory } from '@/types'
import { useDrugSearch } from '@/hooks/use-drug-search'
import type { DrugSuggestion } from '@/hooks/use-drug-search'
import { useDrugScan } from '@/hooks/use-drug-scan'
import { ResultCard } from '@/components/shared/ResultCard'
import { PipelineTrace } from '@/components/shared/PipelineTrace'

function suggestionRiskBadge(category: RiskCategory) {
  if (category === 'KNOWN_RISK')
    return <span className="ml-auto shrink-0 rounded-full bg-[#FFEDEC] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#C41E16]">Known Risk</span>
  if (category === 'POSSIBLE_RISK')
    return <span className="ml-auto shrink-0 rounded-full bg-[#FFF5E0] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#8A5600]">Possible Risk</span>
  if (category === 'CONDITIONAL_RISK')
    return <span className="ml-auto shrink-0 rounded-full bg-[#FFF5E0] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#8A5600]">Conditional</span>
  return null
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

function LoadingSkeleton() {
  return (
    <div className="mt-6 space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-separator-light" />
      <div className="h-5 w-2/3 rounded bg-separator-light" />
      <div className="h-5 w-1/2 rounded bg-separator-light" />
      <div className="h-40 rounded-2xl bg-separator-light" />
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
      setPhotoError(null)
      try {
        const base64 = await readFileAsBase64(file)
        scanByPhoto(base64)
      } catch (err) {
        console.error('Image read failed:', err)
        setPhotoError('Could not read image. Please try again or type the medication name.')
      }
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
          {/* Search input */}
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchLoading && (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-separator border-t-text-secondary" />
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
                setTimeout(() => setShowSuggestions(false), 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleScan(query)
                if (e.key === 'Escape') setShowSuggestions(false)
              }}
              className="h-12 w-full rounded-xl border-[1.5px] border-separator bg-surface-raised pl-10 pr-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              disabled={scanLoading}
            />

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && !scanLoading && (
              <ul
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-separator-light bg-surface-raised shadow-lg"
                onMouseDown={(e) => e.preventDefault()}
              >
                {suggestions.map((s) => (
                  <li key={s.genericName}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary">
                          {s.genericName}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
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

      {/* Scan loading */}
      {scanLoading && <LoadingSkeleton />}

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-2xl border border-[#FF3B30]/20 bg-[#FFEDEC] p-4">
          <p className="text-sm font-medium text-[#C41E16]">{error}</p>
          <button
            type="button"
            onClick={handleNewScan}
            className="mt-2 text-sm font-medium text-[#FF3B30] underline hover:text-[#C41E16]"
          >
            Try again
          </button>
        </div>
      )}

      {/* Text scan result */}
      {result && (
        <div className="mt-6 space-y-4">
          <ResultCard result={result} />
          {result.pipelineTrace && result.pipelineTrace.length > 0 && (
            <PipelineTrace steps={result.pipelineTrace} />
          )}
          <Disclaimer />
        </div>
      )}

      {/* Photo error */}
      {photoError && (
        <div className="mt-6 rounded-2xl border border-[#FF3B30]/20 bg-[#FFEDEC] p-4">
          <p className="text-sm font-medium text-[#C41E16]">{photoError}</p>
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
              <ResultCard result={scanResult} showActions={i === photoResult.scanResults.length - 1} />
              {scanResult.pipelineTrace && scanResult.pipelineTrace.length > 0 && (
                <PipelineTrace steps={scanResult.pipelineTrace} />
              )}
            </div>
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
            className="w-full rounded-xl border-[1.5px] border-separator py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:border-brand hover:text-brand"
          >
            Scan Another Medication
          </button>
        </div>
      )}
    </div>
  )
}
