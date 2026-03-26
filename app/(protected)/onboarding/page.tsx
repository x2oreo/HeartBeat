'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { RiskCategory, Genotype, DrugSearchResult } from '@/types'

// ── Types ───────────────────────────────────────────────────────────

type MedEntry = {
  genericName: string
  riskCategory: RiskCategory
  isDTA: boolean
}

type ContactEntry = {
  name: string
  phone: string
  relationship: string
  errors: { name?: string; phone?: string }
}

// ── Constants ───────────────────────────────────────────────────────

const GENOTYPE_OPTIONS: { value: Genotype; label: string; description: string }[] = [
  { value: 'LQT1', label: 'LQT1', description: 'Triggered by exercise and swimming' },
  { value: 'LQT2', label: 'LQT2', description: 'Triggered by sudden noises and emotional stress' },
  { value: 'LQT3', label: 'LQT3', description: 'Events occur during sleep or rest' },
]

const RELATIONSHIP_OPTIONS = ['Cardiologist', 'Family', 'Friend']

const RISK_COLORS: Record<RiskCategory, { bg: string; text: string; label: string }> = {
  KNOWN_RISK: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-400', label: 'Known Risk' },
  POSSIBLE_RISK: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-400', label: 'Possible Risk' },
  CONDITIONAL_RISK: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-400', label: 'Conditional' },
  NOT_LISTED: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400', label: 'Not Listed' },
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
                  ? 'bg-brand-light text-brand-deep dark:bg-brand-dark dark:text-brand-light'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {step < current ? '✓' : step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-0.5 ${
                step < current ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function RiskBadge({ riskCategory }: { riskCategory: RiskCategory }) {
  const style = RISK_COLORS[riskCategory]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
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

  // Step 2
  const [medications, setMedications] = useState<MedEntry[]>([])
  const [medQuery, setMedQuery] = useState('')
  const [suggestions, setSuggestions] = useState<DrugSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const medInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Step 3
  const [contacts, setContacts] = useState<ContactEntry[]>([
    { name: '', phone: '', relationship: 'Cardiologist', errors: {} },
  ])

  // ── Drug Search ─────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/medications/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data: DrugSearchResult[] = await res.json()
        setSuggestions(data)
      }
    } catch {
      // Silently fail — autocomplete is non-critical
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(medQuery), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [medQuery, fetchSuggestions])

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        medInputRef.current &&
        !medInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addMedication(drug: DrugSearchResult) {
    if (medications.some((m) => m.genericName === drug.genericName)) return
    setMedications((prev) => [
      ...prev,
      { genericName: drug.genericName, riskCategory: drug.riskCategory, isDTA: drug.isDTA },
    ])
    setMedQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    medInputRef.current?.focus()
  }

  function addCustomMedication() {
    const name = medQuery.trim()
    if (!name || medications.some((m) => m.genericName.toLowerCase() === name.toLowerCase())) return
    setMedications((prev) => [
      ...prev,
      { genericName: name, riskCategory: 'NOT_LISTED', isDTA: false },
    ])
    setMedQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  function removeMedication(genericName: string) {
    setMedications((prev) => prev.filter((m) => m.genericName !== genericName))
  }

  // ── Contacts ────────────────────────────────────────────────────

  function updateContact(index: number, field: 'name' | 'phone' | 'relationship', value: string) {
    setContacts((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c
        const updated = { ...c, [field]: value }
        // Clear error for the field being edited
        if (field === 'name' || field === 'phone') {
          updated.errors = { ...c.errors, [field]: undefined }
        }
        return updated
      }),
    )
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: '', phone: '', relationship: 'Family', errors: {} }])
  }

  function removeContact(index: number) {
    if (contacts.length <= 1) return
    setContacts((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Submit ──────────────────────────────────────────────────────

  async function handleSubmit() {
    setError(null)

    // Validate all contacts inline
    let hasErrors = false
    const validated = contacts.map((c) => {
      const errors: ContactEntry['errors'] = {}
      if (!c.name.trim()) { errors.name = 'Name is required'; hasErrors = true }
      const digits = c.phone.replace(/\D/g, '')
      if (!digits) { errors.phone = 'Phone number is required'; hasErrors = true }
      else if (digits.length < 7) { errors.phone = 'Enter a valid phone number'; hasErrors = true }
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
          medications: medications.map((m) => m.genericName),
          emergencyContacts: validated.map((c) => ({
            name: c.name.trim(),
            phone: c.phone.replace(/\D/g, ''), // digits only
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set Up HeartGuard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Personalize your medication safety profile
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Genotype ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              What is your LQTS type?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This helps us tailor medication safety checks to your specific condition.
            </p>

            <div className="space-y-3">
              {GENOTYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGenotype(option.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    genotype === option.value
                      ? 'border-brand bg-brand-light dark:bg-brand-dark/50'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {option.label}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        genotype === option.value
                          ? 'border-brand'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {genotype === option.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-light0" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!genotype}
              className="w-full mt-4 py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* ── Step 2: Medications ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              What medications do you currently take?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We&apos;ll check each medication for QT prolongation risk.
            </p>

            {/* Search input */}
            <div className="relative">
              <input
                ref={medInputRef}
                type="text"
                value={medQuery}
                onChange={(e) => {
                  setMedQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (suggestions.length > 0) {
                      addMedication(suggestions[0])
                    } else if (medQuery.trim()) {
                      addCustomMedication()
                    }
                  }
                }}
                placeholder="Search medication name..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
                >
                  {suggestions.map((drug) => (
                    <button
                      key={drug.genericName}
                      type="button"
                      onClick={() => addMedication(drug)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {drug.genericName}
                        </span>
                        {drug.brandNames.length > 0 && (
                          <span className="text-xs text-gray-400 ml-2">
                            ({drug.brandNames.slice(0, 2).join(', ')})
                          </span>
                        )}
                      </div>
                      <RiskBadge riskCategory={drug.riskCategory} />
                    </button>
                  ))}
                </div>
              )}

              {/* "Add as custom" when no suggestions match */}
              {showSuggestions && medQuery.trim().length >= 2 && suggestions.length === 0 && !searchLoading && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={addCustomMedication}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-gray-600 dark:text-gray-300">
                      Add &quot;{medQuery.trim()}&quot; as medication
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Medication list */}
            {medications.length > 0 && (
              <div className="space-y-2">
                {medications.map((med) => (
                  <div
                    key={med.genericName}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {med.genericName}
                      </span>
                      <RiskBadge riskCategory={med.riskCategory} />
                      {med.isDTA && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-600 text-white">
                          DTA
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedication(med.genericName)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      aria-label={`Remove ${med.genericName}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-deep transition-colors"
              >
                Next
              </button>
            </div>
            {medications.length === 0 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip — I don&apos;t take any medications
              </button>
            )}
          </div>
        )}

        {/* ── Step 3: Emergency Contacts ───────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add your cardiologist and a family member
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These contacts appear on your Emergency Card. At least one is required.
            </p>

            <div className="space-y-4">
              {contacts.map((contact, i) => (
                <div
                  key={i}
                  className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Contact {i + 1}
                    </span>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                      placeholder="Full name"
                      className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent ${
                        contact.errors.name
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {contact.errors.name && (
                      <p className="text-xs text-red-500 mt-1">{contact.errors.name}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={contact.phone}
                      onChange={(e) => updateContact(i, 'phone', e.target.value.replace(/[^\d+\s\-()]/g, ''))}
                      placeholder="Phone number"
                      className={`w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent ${
                        contact.errors.phone
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {contact.errors.phone && (
                      <p className="text-xs text-red-500 mt-1">{contact.errors.phone}</p>
                    )}
                  </div>
                  <select
                    value={contact.relationship}
                    onChange={(e) => updateContact(i, 'relationship', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
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
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors"
            >
              + Add another contact
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-deep disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
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
