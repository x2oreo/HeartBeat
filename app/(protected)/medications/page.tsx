'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useMedications } from '@/hooks/use-medications'
import type { AddMedicationParams } from '@/hooks/use-medications'
import type { RiskCategory, DrugSearchResult } from '@/types'

// ── Constants ────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskCategory, { dot: string; badge: string; label: string }> = {
  KNOWN_RISK:       { dot: 'bg-[#FF3B30]', badge: 'bg-[#FFEDEC] text-[#C41E16]',   label: 'Known Risk' },
  POSSIBLE_RISK:    { dot: 'bg-[#FF9F0A]', badge: 'bg-[#FFF5E0] text-[#8A5600]',   label: 'Possible Risk' },
  CONDITIONAL_RISK: { dot: 'bg-[#FF9F0A]', badge: 'bg-[#FFF5E0] text-[#8A5600]',   label: 'Conditional' },
  NOT_LISTED:       { dot: 'bg-[#34C759]', badge: 'bg-[#EAFBF0] text-[#1B7A34]',   label: 'Not Listed' },
}

// ── Add Medication Panel ─────────────────────────────────────────────

function AddMedicationPanel({ onAdd, onClose }: { onAdd: (params: AddMedicationParams) => Promise<void>; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<DrugSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/medications/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setSuggestions(await res.json())
    } catch { /* non-critical */ } finally { setSearching(false) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function submit(name: string) {
    if (!name.trim() || adding) return
    setAdding(true)
    setError(null)
    try {
      await onAdd({ drugName: name.trim() })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-surface-raised rounded-2xl card-shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text-primary">Add medication</span>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true) }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (suggestions.length > 0) submit(suggestions[0].genericName)
              else if (query.trim()) submit(query.trim())
            }
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Search medication name..."
          className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div ref={suggestionsRef} className="absolute z-10 w-full mt-1 bg-surface-raised border border-separator-light rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((drug) => (
              <button
                key={drug.genericName}
                type="button"
                onClick={() => submit(drug.genericName)}
                className="w-full text-left px-4 py-3 hover:bg-surface transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-text-primary">{drug.genericName}</span>
                  {drug.brandNames.length > 0 && (
                    <span className="text-xs text-text-tertiary ml-2">({drug.brandNames.slice(0, 2).join(', ')})</span>
                  )}
                </div>
                <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${RISK_CONFIG[drug.riskCategory].badge}`}>
                  {RISK_CONFIG[drug.riskCategory].label}
                </span>
              </button>
            ))}
          </div>
        )}

        {showSuggestions && query.trim().length >= 2 && suggestions.length === 0 && !searching && (
          <div className="absolute z-10 w-full mt-1 bg-surface-raised border border-separator-light rounded-xl shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => submit(query.trim())}
              className="w-full text-left px-4 py-3 hover:bg-surface transition-colors text-text-secondary"
            >
              Add &quot;{query.trim()}&quot;
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[#FF3B30]">{error}</p>}

      <button
        type="button"
        onClick={() => { if (suggestions.length > 0) submit(suggestions[0].genericName); else if (query.trim()) submit(query.trim()) }}
        disabled={!query.trim() || adding}
        className="w-full py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {adding ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</> : 'Add Medication'}
      </button>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────

export default function MedicationsPage() {
  const { medications, loading, error, addMedication, removeMedication, fetchMedications } = useMedications()
  const [showAdd, setShowAdd] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const qtCount = medications.filter((m) => m.qtRisk !== 'NOT_LISTED').length

  async function handleRemove(id: string) {
    setRemoving(id)
    try {
      await removeMedication(id)
    } finally {
      setRemoving(null)
      setConfirmRemoveId(null)
    }
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">My Medications</h1>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          )}
        </div>

        {/* QT Warning Banner */}
        {qtCount > 0 && (
          <div className="flex gap-3 p-4 rounded-2xl bg-[#FFF5E0] border border-[#FF9F0A]/20">
            <svg className="w-5 h-5 text-[#FF9F0A] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-[#8A5600]">
              You have <strong>{qtCount} QT-prolonging medication{qtCount !== 1 ? 's' : ''}</strong>. HeartGuard checks every new drug against these.
            </p>
          </div>
        )}

        {/* Add Medication Panel */}
        {showAdd && <AddMedicationPanel onAdd={addMedication} onClose={() => setShowAdd(false)} />}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-separator-light animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 rounded-2xl bg-[#FFEDEC] border border-[#FF3B30]/20 flex items-center justify-between">
            <p className="text-sm text-[#C41E16]">{error}</p>
            <button onClick={fetchMedications} className="text-sm font-semibold text-[#FF3B30] hover:text-[#C41E16] transition-colors ml-4">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && medications.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <p className="font-semibold text-text-primary">No medications added yet</p>
            <p className="text-sm text-text-secondary max-w-xs mx-auto">
              Add your current medications so HeartGuard can check drug combinations.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors"
            >
              Add your first medication
            </button>
          </div>
        )}

        {/* Medication list */}
        {!loading && !error && medications.length > 0 && (
          <div className="space-y-3">
            {medications.map((med) => {
              const risk = RISK_CONFIG[med.qtRisk]
              const isConfirming = confirmRemoveId === med.id
              const isRemoving = removing === med.id

              return (
                <div
                  key={med.id}
                  className="bg-surface-raised rounded-2xl card-shadow p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Risk dot */}
                      <div className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${risk.dot}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-text-primary leading-tight capitalize">{med.genericName}</p>
                        {med.brandName && (
                          <p className="text-sm text-text-secondary capitalize">{med.brandName}</p>
                        )}
                        {med.dosage && (
                          <p className="text-sm text-text-secondary">{med.dosage}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${risk.badge}`}>
                            {risk.label}
                          </span>
                          {med.isDTA && (
                            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF3B30] text-white">
                              DTA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Remove / Confirm */}
                    {isConfirming ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRemove(med.id)}
                          disabled={isRemoving}
                          className="text-xs font-semibold text-[#FF3B30] hover:text-[#C41E16] transition-colors disabled:opacity-50"
                        >
                          {isRemoving ? 'Removing...' : 'Confirm'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(med.id)}
                        className="text-text-tertiary hover:text-[#FF3B30] transition-colors p-1 shrink-0"
                        aria-label={`Remove ${med.genericName}`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
