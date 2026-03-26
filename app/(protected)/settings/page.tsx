'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { Genotype } from '@/types'

// ── Types ────────────────────────────────────────────────────────────

type Contact = { id: string; name: string; phone: string; relationship: string }

type ProfileData = {
  email: string
  genotype: Genotype | null
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

  // Genotype state
  const [genotype, setGenotype] = useState<Genotype | null>(null)
  const [savingGenotype, setSavingGenotype] = useState(false)
  const [genotypeMsg, setGenotypeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New contact form state
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: 'Cardiologist' })
  const [newContactErrors, setNewContactErrors] = useState<{ name?: string; phone?: string }>({})
  const [addContactError, setAddContactError] = useState<string | null>(null)
  const [addingContact, setAddingContact] = useState(false)
  const [removingContactId, setRemovingContactId] = useState<string | null>(null)

  // Sign out
  const [signingOut, setSigningOut] = useState(false)

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

        setProfile({ email: profileData.email ?? '', genotype: profileData.genotype ?? null, contacts })
        setGenotype(profileData.genotype ?? null)
      } catch {
        // Non-fatal — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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

  // ── Contacts ────────────────────────────────────────────────────

  function validateNewContact() {
    const errors: typeof newContactErrors = {}
    if (!newContact.name.trim()) errors.name = 'Name is required'
    const digits = newContact.phone.replace(/\D/g, '')
    if (!digits) errors.phone = 'Phone is required'
    else if (digits.length < 7) errors.phone = 'Enter a valid phone number'
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
          name: newContact.name.trim(),
          phone: newContact.phone.replace(/\D/g, ''),
          relationship: newContact.relationship.toLowerCase(),
        }),
      })
      if (!res.ok) throw new Error()
      const created: Contact = await res.json()
      setProfile((prev) => prev ? { ...prev, contacts: [...prev.contacts, created] } : prev)
      setNewContact({ name: '', phone: '', relationship: 'Cardiologist' })
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
      <div className="px-4 py-8">
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
    <div className="px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">

        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

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

        {/* ── Emergency Contacts ───────────────────────────────── */}
        <Section title="Emergency Contacts">
          {profile?.contacts.length === 0 && !showAddContact && (
            <p className="text-sm text-text-secondary">No contacts added yet.</p>
          )}

          <div className="space-y-3">
            {profile?.contacts.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 p-3 bg-surface rounded-xl">
                <div>
                  <p className="font-medium text-text-primary">{c.name}</p>
                  <p className="text-sm text-text-secondary">{c.phone}</p>
                  <p className="text-xs text-text-tertiary capitalize mt-0.5">{c.relationship}</p>
                </div>
                <button
                  onClick={() => removeContact(c.id)}
                  disabled={removingContactId === c.id}
                  className="text-text-tertiary hover:text-[#FF3B30] transition-colors p-1 disabled:opacity-50 shrink-0"
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
            ))}
          </div>

          {showAddContact ? (
            <div className="space-y-3 p-3 bg-surface rounded-xl">
              <div>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                  className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${newContactErrors.name ? 'border-[#FF3B30]' : 'border-separator'}`}
                />
                {newContactErrors.name && <p className="text-xs text-[#FF3B30] mt-1">{newContactErrors.name}</p>}
              </div>
              <div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={newContact.phone}
                  onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value.replace(/[^\d+\s\-()]/g, '') }))}
                  placeholder="Phone number"
                  className={`w-full px-3.5 py-3 rounded-xl border-[1.5px] bg-surface-raised text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition ${newContactErrors.phone ? 'border-[#FF3B30]' : 'border-separator'}`}
                />
                {newContactErrors.phone && <p className="text-xs text-[#FF3B30] mt-1">{newContactErrors.phone}</p>}
              </div>
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
