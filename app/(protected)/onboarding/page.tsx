'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RiskCategory, Genotype, AutocompleteSuggestion } from '@/types'
import PhoneInput from '@/components/PhoneInput'
import { parseE164, validateNationalNumber } from '@/lib/phone-countries'
import { DrugSearchInput } from '@/components/shared/DrugSearchInput'

// ── Types ───────────────────────────────────────────────────────────

type MedEntry = {
  genericName: string
  riskCategory: RiskCategory | null
  isDTA: boolean
}

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

const RISK_COLORS: Record<RiskCategory, { bg: string; text: string; label: string }> = {
  KNOWN_RISK: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-400', label: 'Known Risk' },
  POSSIBLE_RISK: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-400', label: 'Possible Risk' },
  CONDITIONAL_RISK: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-400', label: 'Conditional' },
  NOT_LISTED: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400', label: 'Safe' },
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

function RiskBadge({ riskCategory }: { riskCategory: RiskCategory | null }) {
  if (riskCategory === null) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        Not Evaluated
      </span>
    )
  }
  const style = RISK_COLORS[riskCategory]
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
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

  // Step 3
  const [contacts, setContacts] = useState<ContactEntry[]>([
    { firstName: '', lastName: '', phone: '', relationship: 'Cardiologist', errors: {} },
  ])

  // ── Drug Search ─────────────────────────────────────────────────

  function addMedication(drug: AutocompleteSuggestion) {
    if (medications.some((m) => m.genericName === drug.genericName)) return
    setMedications((prev) => [
      ...prev,
      { genericName: drug.genericName, riskCategory: drug.riskCategory, isDTA: drug.isDTA },
    ])
  }

  function addCustomMedication(name: string) {
    if (!name || medications.some((m) => m.genericName.toLowerCase() === name.toLowerCase())) return
    setMedications((prev) => [
      ...prev,
      { genericName: name, riskCategory: null, isDTA: false },
    ])
  }

  function removeMedication(genericName: string) {
    setMedications((prev) => prev.filter((m) => m.genericName !== genericName))
  }

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
          medications: medications.map((m) => m.genericName),
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

        {/* ── Step 2: Medications ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              What medications do you currently take?
            </h2>
            <p className="text-sm text-text-secondary">
              We&apos;ll check each medication for QT prolongation risk.
            </p>

            <DrugSearchInput
              onSelect={addMedication}
              onAddCustom={addCustomMedication}
              placeholder="Search medication name..."
            />

            {/* Medication list */}
            {medications.length > 0 && (
              <div className="space-y-2">
                {medications.map((med) => (
                  <div
                    key={med.genericName}
                    className="flex items-center justify-between p-3 bg-surface-raised rounded-xl card-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-text-primary">
                        {med.genericName}
                      </span>
                      <RiskBadge riskCategory={med.riskCategory} />
                      {med.isDTA && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF3B30] text-white">
                          DTA
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedication(med.genericName)}
                      className="text-text-tertiary hover:text-[#FF3B30] transition-colors p-1"
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
                className="flex-1 py-3 rounded-xl font-semibold text-text-secondary bg-separator-light hover:bg-separator transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-brand hover:bg-brand-hover transition-colors"
              >
                Next
              </button>
            </div>
            {medications.length === 0 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Skip — I don&apos;t take any medications
              </button>
            )}
          </div>
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
