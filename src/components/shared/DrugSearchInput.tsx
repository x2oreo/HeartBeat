'use client'

import { useState, useEffect, useRef } from 'react'
import { useDrugSearch } from '@/hooks/use-drug-search'
import type { AutocompleteSuggestion, RiskCategory } from '@/types'

type DrugSearchInputProps = {
  onSelect: (drug: AutocompleteSuggestion) => void
  onSubmit?: (query: string) => void
  onAddCustom?: (name: string) => void
  onQueryChange?: (query: string) => void
  disabled?: boolean
  placeholder?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  resetSignal?: number
}

function riskBadge(category: RiskCategory | null) {
  if (category === 'KNOWN_RISK')
    return <span className="ml-auto shrink-0 rounded-full bg-risk-danger-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-risk-danger-text">Known Risk</span>
  if (category === 'POSSIBLE_RISK')
    return <span className="ml-auto shrink-0 rounded-full bg-risk-caution-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-risk-caution-text">Possible Risk</span>
  if (category === 'CONDITIONAL_RISK')
    return <span className="ml-auto shrink-0 rounded-full bg-risk-caution-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-risk-caution-text">Conditional</span>
  if (category === 'NOT_LISTED')
    return <span className="ml-auto shrink-0 rounded-full bg-risk-safe-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-risk-safe-text">Safe</span>
  return <span className="ml-auto shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Not Evaluated</span>
}

export function DrugSearchInput({
  onSelect,
  onSubmit,
  onAddCustom,
  onQueryChange,
  disabled,
  placeholder = 'Search medication name...',
  inputRef,
  resetSignal,
}: DrugSearchInputProps) {
  const { query, setQuery, suggestions, loading } = useDrugSearch()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const prevResetSignal = useRef(resetSignal)

  useEffect(() => {
    if (resetSignal !== prevResetSignal.current) {
      prevResetSignal.current = resetSignal
      setQuery('')
      setShowSuggestions(false)
      onQueryChange?.('')
    }
  }, [resetSignal, setQuery, onQueryChange])

  function handleChange(value: string) {
    setQuery(value)
    setShowSuggestions(true)
    onQueryChange?.(value)
  }

  function handleSelect(drug: AutocompleteSuggestion) {
    setQuery(drug.genericName)
    setShowSuggestions(false)
    onQueryChange?.(drug.genericName)
    onSelect(drug)
  }

  function handleAddCustom() {
    const name = query.trim()
    if (!name) return
    setShowSuggestions(false)
    onAddCustom?.(name)
    setQuery('')
    onQueryChange?.('')
  }

  return (
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
      {loading && (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-separator border-t-text-secondary" />
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (suggestions.length > 0) {
              handleSelect(suggestions[0])
            } else if (onSubmit) {
              onSubmit(query)
            } else if (onAddCustom && query.trim()) {
              handleAddCustom()
            }
          }
          if (e.key === 'Escape') setShowSuggestions(false)
        }}
        className="h-12 w-full rounded-xl border-[1.5px] border-separator bg-surface-raised pl-10 pr-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        disabled={disabled}
      />

      {showSuggestions && suggestions.length > 0 && !disabled && (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-separator-light bg-surface-raised shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((s) => (
            <li key={s.genericName}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary capitalize">
                    {s.genericName}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {s.drugClass ?? (s.source === 'BG_POSITIVE_LIST' ? '🇧🇬 Bulgarian drug' : s.source === 'RXNORM' ? 'From RxNorm' : '')}
                    {s.brandNames.length > 0 && ` · ${s.brandNames.join(', ')}`}
                  </p>
                </div>
                {riskBadge(s.riskCategory)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && onAddCustom && query.trim().length >= 2 && suggestions.length === 0 && !loading && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-separator-light bg-surface-raised shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={handleAddCustom}
            className="w-full px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:bg-surface"
          >
            Add &quot;{query.trim()}&quot; as medication
          </button>
        </div>
      )}
    </div>
  )
}
