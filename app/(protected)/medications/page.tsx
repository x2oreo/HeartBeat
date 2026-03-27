'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMedications } from '@/hooks/use-medications'
import type { RiskCategory } from '@/types'

// ── Constants ────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskCategory, {
  border: string
  dot: string
  badge: string
  label: string
}> = {
  KNOWN_RISK:       { border: 'border-l-red-500',    dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',             label: 'Known Risk' },
  POSSIBLE_RISK:    { border: 'border-l-yellow-500', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400', label: 'Possible Risk' },
  CONDITIONAL_RISK: { border: 'border-l-orange-500', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400', label: 'Conditional' },
  NOT_LISTED:       { border: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400', label: 'Safe' },
}

// ── Main Page ────────────────────────────────────────────────────────

export default function MedicationsPage() {
  const { medications, loading, error, removeMedication, fetchMedications } = useMedications()
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
    <div className="px-4 py-6">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">My Medications</h1>
            {!loading && medications.length > 0 && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {medications.length} medication{medications.length !== 1 ? 's' : ''}
                {qtCount > 0 && <> · <span className="text-amber-600 dark:text-amber-400 font-medium">{qtCount} QT risk</span></>}
              </p>
            )}
          </div>
          <Link
            href="/scan"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-deep text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </Link>
        </div>

        {/* QT Warning Banner */}
        {qtCount > 0 && !loading && (
          <div className="flex gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>{qtCount} QT-prolonging medication{qtCount !== 1 ? 's' : ''}</strong> on your list. HeartGuard checks every new drug against these.
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[76px] rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button onClick={fetchMedications} className="text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors ml-4">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && medications.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <p className="font-semibold text-neutral-900 dark:text-white">No medications yet</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
              Scan a medication to check its QT risk, then add it to your list.
            </p>
            <Link
              href="/scan"
              className="inline-block mt-2 px-5 py-2 rounded-xl bg-brand hover:bg-brand-deep text-white text-sm font-semibold transition-colors"
            >
              Scan a medication
            </Link>
          </div>
        )}

        {/* Medication list */}
        {!loading && !error && medications.length > 0 && (
          <div className="space-y-2.5">
            {medications.map((med) => {
              const risk = RISK_CONFIG[med.qtRisk]
              const isConfirming = confirmRemoveId === med.id
              const isRemoving = removing === med.id

              return (
                <div
                  key={med.id}
                  className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 border-l-4 ${risk.border} px-4 py-3.5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">

                      {/* Name row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-900 dark:text-white leading-tight capitalize">
                          {med.genericName}
                        </span>
                        {med.brandName && (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 capitalize">
                            {med.brandName}
                          </span>
                        )}
                      </div>

                      {/* Intake row */}
                      {(med.dosage || med.frequency) && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <svg className="w-3 h-3 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}

                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${risk.badge}`}>
                          {risk.label}
                        </span>
                        {med.isDTA && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
                            DTA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove / Confirm */}
                    <div className="shrink-0 flex items-center">
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRemove(med.id)}
                            disabled={isRemoving}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                          >
                            {isRemoving ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(med.id)}
                          className="text-neutral-300 hover:text-red-400 dark:text-neutral-700 dark:hover:text-red-500 transition-colors p-1"
                          aria-label={`Remove ${med.genericName}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
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
