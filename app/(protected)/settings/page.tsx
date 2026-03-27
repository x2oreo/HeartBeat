'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Genotype } from '@/types'
import PhoneInput from '@/components/PhoneInput'
import { COUNTRIES, parseE164, validateNationalNumber, formatPhoneDisplay } from '@/lib/phone-countries'
import { getEmergencyInfo } from '@/data/country-emergency-numbers'

// ── Avatar helpers ────────────────────────────────────────────────────

const AVATAR_HUES = [210, 160, 280, 30, 190, 340, 60]

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  const hue = AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length]
  return `hsl(${hue} 60% 45%)`
}

function avatarInitials(firstName: string, lastName: string, email: string): string {
  const f = firstName.trim()
  const l = lastName.trim()
  if (f && l) return (f[0] + l[0]).toUpperCase()
  if (f) return f.slice(0, 2).toUpperCase()
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// ── Types ────────────────────────────────────────────────────────────

type Contact = { id: string; name: string; phone: string; email?: string; relationship: string }

type ProfileData = {
  firstName: string
  lastName: string
  email: string
  genotype: Genotype | null
  country: string | null
  contacts: Contact[]
}

const GENOTYPE_OPTIONS: { value: Genotype; label: string }[] = [
  { value: 'LQT1', label: 'LQT1' },
  { value: 'LQT2', label: 'LQT2' },
  { value: 'LQT3', label: 'LQT3' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNKNOWN', label: "I don't know" },
]

const RELATIONSHIP_OPTIONS = ['Cardiologist', 'Family', 'Friend']

// ── Section wrapper ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-raised rounded-2xl card-shadow overflow-hidden">
      <div className="px-5 py-3 border-b border-separator-light">
        <h2 className="font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Name state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Genotype state
  const [genotype, setGenotype] = useState<Genotype | null>(null)
  const [savingGenotype, setSavingGenotype] = useState(false)
  const [genotypeMsg, setGenotypeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Country state
  const [country, setCountry] = useState<string | null>(null)
  const [savingCountry, setSavingCountry] = useState(false)
  const [countryMsg, setCountryMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New contact form state
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '', phone: '', email: '', relationship: 'Cardiologist' })
  const [newContactErrors, setNewContactErrors] = useState<{ firstName?: string; lastName?: string; phone?: string }>({})
  const [addContactError, setAddContactError] = useState<string | null>(null)
  const [addingContact, setAddingContact] = useState(false)
  const [removingContactId, setRemovingContactId] = useState<string | null>(null)

  // Edit contact form state
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editContact, setEditContact] = useState({ firstName: '', lastName: '', phone: '', email: '', relationship: 'Cardiologist' })
  const [editContactErrors, setEditContactErrors] = useState<{ firstName?: string; lastName?: string; phone?: string }>({})
  const [editContactError, setEditContactError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Sign out
  const [signingOut, setSigningOut] = useState(false)

  // Test notifications
  const [testingNotifications, setTestingNotifications] = useState(false)
  type TestChannelResult = { success: boolean; error?: string }
  type TestContactResult = { contact: string; phone: string; email: string | null; sms: TestChannelResult; voice: TestChannelResult; email_channel: TestChannelResult }
  type TestSOSResponse = {
    notified: boolean
    contactsReached: number
    smsText: string
    voiceScript: string
    emailSubject: string
    perContact: TestContactResult[]
  }
  const [testResponse, setTestResponse] = useState<TestSOSResponse | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  // ── Load profile ────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, contactsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/settings/contacts'),
        ])
        const profileData = profileRes.ok ? await profileRes.json() : {}
        const contacts: Contact[] = contactsRes.ok ? await contactsRes.json() : []

        setProfile({ firstName: profileData.firstName ?? '', lastName: profileData.lastName ?? '', email: profileData.email ?? '', genotype: profileData.genotype ?? null, country: profileData.country ?? null, contacts })
        setFirstName(profileData.firstName ?? '')
        setLastName(profileData.lastName ?? '')
        setGenotype(profileData.genotype ?? null)
        setCountry(profileData.country ?? null)
      } catch {
        // Non-fatal — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Name ────────────────────────────────────────────────────────

  const nameChanged = firstName.trim() !== (profile?.firstName ?? '') || lastName.trim() !== (profile?.lastName ?? '')

  async function saveName() {
    if (!firstName.trim() || !lastName.trim()) return
    setSavingName(true)
    setNameMsg(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setProfile((prev) => prev ? { ...prev, firstName: firstName.trim(), lastName: lastName.trim() } : prev)
      setNameMsg({ type: 'success', text: 'Saved' })
      setTimeout(() => setNameMsg(null), 2000)
    } catch {
      setNameMsg({ type: 'error', text: 'Failed to save. Try again.' })
    } finally {
      setSavingName(false)
    }
  }

  // ── Genotype ────────────────────────────────────────────────────

  async function saveGenotype() {
    if (!genotype) return
    setSavingGenotype(true)
    setGenotypeMsg(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genotype }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setGenotypeMsg({ type: 'success', text: 'Saved' })
      setTimeout(() => setGenotypeMsg(null), 2000)
    } catch {
      setGenotypeMsg({ type: 'error', text: 'Failed to save. Try again.' })
    } finally {
      setSavingGenotype(false)
    }
  }

  // ── Country ─────────────────────────────────────────────────────

  async function saveCountry() {
    setSavingCountry(true)
    setCountryMsg(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: country ?? null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setProfile((prev) => prev ? { ...prev, country } : prev)
      setCountryMsg({ type: 'success', text: 'Saved' })
      setTimeout(() => setCountryMsg(null), 2000)
    } catch {
      setCountryMsg({ type: 'error', text: 'Failed to save. Try again.' })
    } finally {
      setSavingCountry(false)
    }
  }

  // ── Contacts ────────────────────────────────────────────────────

  function validateNewContact() {
    const errors: typeof newContactErrors = {}
    if (!newContact.firstName.trim()) errors.firstName = 'First name is required'
    if (!newContact.lastName.trim()) errors.lastName = 'Last name is required'
    const { country: phoneCountry, nationalNumber } = parseE164(newContact.phone)
    const phoneError = validateNationalNumber(phoneCountry, nationalNumber)
    if (phoneError) errors.phone = phoneError
    setNewContactErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function addContact() {
    if (!validateNewContact()) return
    setAddingContact(true)
    setAddContactError(null)
    try {
      const res = await fetch('/api/settings/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${newContact.firstName.trim()} ${newContact.lastName.trim()}`,
          phone: newContact.phone,
          ...(newContact.email.trim() ? { email: newContact.email.trim() } : {}),
          relationship: newContact.relationship.toLowerCase(),
        }),
      })
      if (!res.ok) throw new Error()
      const created: Contact = await res.json()
      setProfile((prev) => prev ? { ...prev, contacts: [...prev.contacts, created] } : prev)
      setNewContact({ firstName: '', lastName: '', phone: '', email: '', relationship: 'Cardiologist' })
      setNewContactErrors({})
      setShowAddContact(false)
    } catch {
      setAddContactError('Failed to add contact. Try again.')
    } finally {
      setAddingContact(false)
    }
  }

  async function removeContact(id: string) {
    setRemovingContactId(id)
    try {
      const res = await fetch('/api/settings/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: id }),
      })
      if (!res.ok) throw new Error()
      setProfile((prev) => prev ? { ...prev, contacts: prev.contacts.filter((c) => c.id !== id) } : prev)
    } catch {
      // No-op — contact stays in list
    } finally {
      setRemovingContactId(null)
    }
  }

  function startEditing(contact: Contact) {
    const nameParts = contact.name.split(' ')
    const first = nameParts[0] ?? ''
    const last = nameParts.slice(1).join(' ')
    setEditingContactId(contact.id)
    setEditContact({
      firstName: first,
      lastName: last,
      phone: contact.phone,
      email: contact.email ?? '',
      relationship: contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1),
    })
    setEditContactErrors({})
    setEditContactError(null)
  }

  function cancelEditing() {
    setEditingContactId(null)
    setEditContactErrors({})
    setEditContactError(null)
  }

  function validateEditContact() {
    const errors: typeof editContactErrors = {}
    if (!editContact.firstName.trim()) errors.firstName = 'First name is required'
    if (!editContact.lastName.trim()) errors.lastName = 'Last name is required'
    const { country: phoneCountry, nationalNumber } = parseE164(editContact.phone)
    const phoneError = validateNationalNumber(phoneCountry, nationalNumber)
    if (phoneError) errors.phone = phoneError
    setEditContactErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function saveEditContact() {
    if (!editingContactId || !validateEditContact()) return
    setSavingEdit(true)
    setEditContactError(null)
    try {
      const res = await fetch('/api/settings/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: editingContactId,
          name: `${editContact.firstName.trim()} ${editContact.lastName.trim()}`,
          phone: editContact.phone,
          ...(editContact.email.trim() ? { email: editContact.email.trim() } : { email: null }),
          relationship: editContact.relationship.toLowerCase(),
        }),
      })
      if (!res.ok) throw new Error()
      const updated: Contact = await res.json()
      setProfile((prev) => prev ? {
        ...prev,
        contacts: prev.contacts.map((c) => c.id === updated.id ? updated : c),
      } : prev)
      setEditingContactId(null)
    } catch {
      setEditContactError('Failed to save. Try again.')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Test notifications ──────────────────────────────────────────

  async function handleTestNotifications() {
    setTestingNotifications(true)
    setTestResponse(null)
    setTestError(null)
    try {
      const res = await fetch('/api/sos/test', { method: 'POST' })
      const data: unknown = await res.json()
      if (!res.ok) {
        const errMsg = typeof data === 'object' && data !== null && typeof (data as Record<string, unknown>).error === 'string'
          ? (data as Record<string, unknown>).error as string
          : 'Test failed. Check your contacts and credentials.'
        setTestError(errMsg)
      } else {
        setTestResponse(data as TestSOSResponse)
      }
    } catch {
      setTestError('Network error. Make sure the dev server is running.')
    } finally {
      setTestingNotifications(false)
    }
  }

  // ── Sign out ────────────────────────────────────────────────────

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-3 py-5 md:px-4 md:py-8">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="h-8 w-32 bg-separator-light rounded-lg animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-separator-light animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-5 md:px-4 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">

        {/* ── Profile Header ──────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white select-none shrink-0"
            style={{ background: avatarColor(profile?.email ?? '') }}
          >
            {avatarInitials(firstName, lastName, profile?.email ?? '')}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {firstName.trim() && lastName.trim() ? `${firstName.trim()} ${lastName.trim()}` : 'Profile & Settings'}
            </h1>
            <p className="text-sm text-text-secondary">{profile?.email ?? ''}</p>
          </div>
        </div>

        {/* ── Name ───────────────────────────────────────────── */}
        <Section title="Your Name">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
              />
            </div>
          </div>
          <button
            onClick={saveName}
            disabled={savingName || !firstName.trim() || !lastName.trim() || !nameChanged}
            className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {savingName ? 'Saving…' : 'Save'}
          </button>
          {nameMsg && (
            <p className={`text-sm ${nameMsg.type === 'success' ? 'text-[#1B7A34]' : 'text-[#FF3B30]'}`}>
              {nameMsg.text}
            </p>
          )}
        </Section>

        {/* ── Genotype ─────────────────────────────────────────── */}
        <Section title="LQTS Type">
          <p className="text-sm text-text-secondary">
            Used to personalise drug safety checks.
          </p>
          <div className="flex gap-3">
            <select
              value={genotype ?? ''}
              onChange={(e) => setGenotype(e.target.value as Genotype)}
              className="flex-1 px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
            >
              <option value="" disabled>Select type</option>
              {GENOTYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={saveGenotype}
              disabled={savingGenotype || !genotype || genotype === profile?.genotype}
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {savingGenotype ? 'Saving…' : 'Save'}
            </button>
          </div>
          {genotypeMsg && (
            <p className={`text-sm ${genotypeMsg.type === 'success' ? 'text-[#1B7A34]' : 'text-[#FF3B30]'}`}>
              {genotypeMsg.text}
            </p>
          )}
        </Section>

        {/* ── Country & Emergency Services ─────────────────────── */}
        <Section title="Country & Emergency Services">
          <p className="text-sm text-text-secondary">
            Your local emergency number is included in every SOS alert sent to your contacts.
          </p>
          {(() => {
            const emergencyInfo = getEmergencyInfo(country)
            return (
              <div className="p-4 rounded-xl bg-[#F5F0FF] border border-[#C4B5FD] flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide mb-0.5">
                    Ambulance — {emergencyInfo.countryName}
                  </p>
                  <p className="text-3xl font-black text-[#4C1D95] tracking-widest leading-none">
                    {emergencyInfo.ambulance}
                  </p>
                  {emergencyInfo.general !== emergencyInfo.ambulance && (
                    <p className="text-xs text-[#7C3AED] mt-1">
                      General emergency: {emergencyInfo.general}
                    </p>
                  )}
                </div>
                <a
                  href={`tel:${emergencyInfo.ambulance}`}
                  className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-[#7C3AED] text-white shadow-md hover:bg-[#6D28D9] active:scale-95 transition-all"
                  aria-label={`Call ${emergencyInfo.ambulance}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </a>
              </div>
            )
          })()}
          <div className="flex gap-2">
            <select
              value={country ?? ''}
              onChange={(e) => setCountry(e.target.value || null)}
              className="flex-1 px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
            >
              <option value="">Not set (uses 112 — international)</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={saveCountry}
              disabled={savingCountry || country === profile?.country}
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {savingCountry ? 'Saving…' : 'Save'}
            </button>
          </div>
          {countryMsg && (
            <p className={`text-sm ${countryMsg.type === 'success' ? 'text-[#1B7A34]' : 'text-[#FF3B30]'}`}>
              {countryMsg.text}
            </p>
          )}
        </Section>

        {/* ── Emergency Contacts ───────────────────────────────── */}
        <Section title="Emergency Contacts">
          {profile?.contacts.length === 0 && !showAddContact && (
            <p className="text-sm text-text-secondary">No contacts added yet.</p>
          )}

          <div className="space-y-3">
            {profile?.contacts.map((c) =>
              editingContactId === c.id ? (
                <div key={c.id} className="space-y-3 p-3 bg-surface rounded-xl">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editContact.firstName}
                        onChange={(e) => setEditContact((p) => ({ ...p, firstName: e.target.value }))}
                        placeholder="First name"
                        className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${editContactErrors.firstName ? 'border-[#FF3B30]' : 'border-separator'}`}
                      />
                      {editContactErrors.firstName && <p className="text-xs text-[#FF3B30] mt-1">{editContactErrors.firstName}</p>}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editContact.lastName}
                        onChange={(e) => setEditContact((p) => ({ ...p, lastName: e.target.value }))}
                        placeholder="Last name"
                        className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${editContactErrors.lastName ? 'border-[#FF3B30]' : 'border-separator'}`}
                      />
                      {editContactErrors.lastName && <p className="text-xs text-[#FF3B30] mt-1">{editContactErrors.lastName}</p>}
                    </div>
                  </div>
                  <PhoneInput
                    value={editContact.phone}
                    onChange={(val) => setEditContact((p) => ({ ...p, phone: val }))}
                    error={editContactErrors.phone}
                  />
                  <input
                    type="email"
                    value={editContact.email}
                    onChange={(e) => setEditContact((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email (optional)"
                    className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
                  />
                  <select
                    value={editContact.relationship}
                    onChange={(e) => setEditContact((p) => ({ ...p, relationship: e.target.value }))}
                    className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
                  >
                    {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {editContactError && (
                    <p className="text-xs text-[#FF3B30]">{editContactError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-secondary bg-separator-light hover:bg-separator transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditContact}
                      disabled={savingEdit}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 transition-colors"
                    >
                      {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div key={c.id} className="flex items-start justify-between gap-3 p-3 bg-surface rounded-xl">
                  <div>
                    <p className="font-medium text-text-primary">{c.name}</p>
                    <p className="text-sm text-text-secondary">{formatPhoneDisplay(c.phone)}</p>
                    {c.email && <p className="text-sm text-text-secondary">{c.email}</p>}
                    <p className="text-xs text-text-tertiary capitalize mt-0.5">{c.relationship}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEditing(c)}
                      className="text-text-tertiary hover:text-brand transition-colors p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`Edit ${c.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeContact(c.id)}
                      disabled={removingContactId === c.id}
                      className="text-text-tertiary hover:text-[#FF3B30] transition-colors p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
                      aria-label={`Remove ${c.name}`}
                    >
                      {removingContactId === c.id ? (
                        <div className="w-4 h-4 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>

          {showAddContact ? (
            <div className="space-y-3 p-3 bg-surface rounded-xl">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${newContactErrors.firstName ? 'border-[#FF3B30]' : 'border-separator'}`}
                  />
                  {newContactErrors.firstName && <p className="text-xs text-[#FF3B30] mt-1">{newContactErrors.firstName}</p>}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${newContactErrors.lastName ? 'border-[#FF3B30]' : 'border-separator'}`}
                  />
                  {newContactErrors.lastName && <p className="text-xs text-[#FF3B30] mt-1">{newContactErrors.lastName}</p>}
                </div>
              </div>
              <PhoneInput
                value={newContact.phone}
                onChange={(val) => setNewContact((p) => ({ ...p, phone: val }))}
                error={newContactErrors.phone}
              />
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email (optional)"
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
              />
              <select
                value={newContact.relationship}
                onChange={(e) => setNewContact((p) => ({ ...p, relationship: e.target.value }))}
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-separator bg-surface-raised text-text-primary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
              >
                {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {addContactError && (
                <p className="text-xs text-[#FF3B30]">{addContactError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddContact(false); setNewContactErrors({}); setAddContactError(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-secondary bg-separator-light hover:bg-separator transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addContact}
                  disabled={addingContact}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 transition-colors"
                >
                  {addingContact ? 'Adding…' : 'Add Contact'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddContact(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-separator text-sm font-medium text-text-secondary hover:border-brand hover:text-brand transition-colors"
            >
              + Add contact
            </button>
          )}
        </Section>

        {/* ── Test Notifications ───────────────────────────────── */}
        <Section title="Test Notifications">
          <p className="text-sm text-text-secondary">
            Sends real-format SOS notifications (same as a live cardiac event) to all emergency contacts using simulated Apple Watch data: <strong>187 BPM, irregular rhythm, HIGH stress</strong>. Messages are prefixed with <strong>[TEST — THIS IS A DRILL]</strong>.
          </p>
          <button
            onClick={handleTestNotifications}
            disabled={testingNotifications}
            className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            {testingNotifications ? 'Sending test…' : 'Send Test Notifications'}
          </button>
          {testError && (
            <p className="text-sm text-risk-danger-text bg-risk-danger-bg rounded-xl px-3 py-2">{testError}</p>
          )}
          {testResponse && (
            <div className="space-y-4">
              {/* Per-contact delivery results */}
              <div className="space-y-2">
                {testResponse.perContact.map((r, i) => (
                  <div key={i} className="rounded-xl bg-surface p-3 space-y-1.5">
                    <p className="text-sm font-semibold text-text-primary">
                      {r.contact} <span className="font-normal text-text-tertiary text-xs">{r.phone}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.sms.success ? 'bg-risk-safe-bg text-risk-safe-text' : 'bg-risk-danger-bg text-risk-danger-text'}`}>
                        SMS {r.sms.success ? '✓' : `✗ ${r.sms.error ?? ''}`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.voice.success ? 'bg-risk-safe-bg text-risk-safe-text' : 'bg-risk-danger-bg text-risk-danger-text'}`}>
                        Voice {r.voice.success ? '✓' : `✗ ${r.voice.error ?? ''}`}
                      </span>
                      {r.email && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.email_channel.success ? 'bg-risk-safe-bg text-risk-safe-text' : 'bg-risk-danger-bg text-risk-danger-text'}`}>
                          Email {r.email_channel.success ? '✓' : `✗ ${r.email_channel.error ?? ''}`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Exact SMS text sent */}
              {testResponse.smsText && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Exact SMS sent</p>
                  <pre className="text-xs text-text-primary bg-surface rounded-xl px-4 py-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                    {testResponse.smsText}
                  </pre>
                </div>
              )}

              {/* Exact voice script read aloud */}
              {testResponse.voiceScript && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Exact voice call script</p>
                  <p className="text-xs text-text-primary bg-surface rounded-xl px-4 py-3 leading-relaxed">
                    {testResponse.voiceScript}
                  </p>
                </div>
              )}

              {/* Email subject */}
              {testResponse.emailSubject && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Email subject</p>
                  <p className="text-xs text-text-primary bg-surface rounded-xl px-4 py-3 font-mono">{testResponse.emailSubject}</p>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Account ──────────────────────────────────────────── */}
        <Section title="Account">
          <div>
            <p className="text-xs text-text-secondary mb-1">Email</p>
            <p className="text-text-primary">{profile?.email ?? '—'}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-3 rounded-xl border-2 border-[#FF3B30]/20 text-[#FF3B30] text-sm font-semibold hover:bg-[#FFEDEC] disabled:opacity-50 transition-colors"
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </Section>

      </div>
    </div>
  )
}
