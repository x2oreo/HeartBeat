'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { EnhancedEmergencyCardData, ProfileData, ContactData, MedicationData } from '@/types'
import { translations } from '@/lib/translations/emergency-card'
import { genotypeSchema, riskCategorySchema } from '@/ai/document-schemas'

/* ─── Helpers ─────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
}

function getRiskStyleLocal(risk: string) {
  switch (risk) {
    case 'KNOWN_RISK': return { bg: 'bg-[#FFEDEC]', text: 'text-[#C41E16]', label: 'Known Risk' }
    case 'POSSIBLE_RISK': return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', label: 'Possible Risk' }
    case 'CONDITIONAL_RISK': return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', label: 'Conditional' }
    default: return { bg: 'bg-[#EAFBF0]', text: 'text-[#1B7A34]', label: 'Not Listed' }
  }
}

/* ─── Collapsible Section ─────────────────────────────────── */

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface/50 transition-colors cursor-pointer"
      >
        <span className="text-[15px] font-medium text-text-primary">{title}</span>
        <svg
          className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      {open && (
        <div className="animate-expand">
          {children}
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ──────────────────────────────────────── */

export function EmergencyCardClient() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [contacts, setContacts] = useState<ContactData[]>([])
  const [medications, setMedications] = useState<MedicationData[]>([])
  const [notesEn, setNotesEn] = useState('')
  const [notesBg, setNotesBg] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)


  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [profileRes, contactsRes, medsRes, existingRes] = await Promise.all([
          fetch('/api/settings').then(r => r.ok ? r.json() : null),
          fetch('/api/settings/contacts').then(r => r.ok ? r.json() : []),
          fetch('/api/medications').then(r => r.ok ? r.json() : []),
          fetch('/api/documents/emergency-card').then(r => r.ok ? r.json() : null),
        ])

        if (profileRes) {
          const fullName = [profileRes.firstName, profileRes.lastName].filter(Boolean).join(' ') || null
          setProfile({ name: fullName, email: profileRes.email, genotype: profileRes.genotype })
        }
        if (Array.isArray(contactsRes)) setContacts(contactsRes)
        if (Array.isArray(medsRes)) setMedications(medsRes)

        if (existingRes && !existingRes.error) {
          // patientPhoto no longer used — initials displayed instead
          if (existingRes.personalNotes) {
            setNotesEn(existingRes.personalNotes.en ?? '')
            setNotesBg(existingRes.personalNotes.bg ?? '')
          }
          if (existingRes.shareSlug) {
            setShareUrl(`${window.location.origin}/emergency-card/${existingRes.shareSlug}`)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Generate QR code when shareUrl changes
  useEffect(() => {
    if (!shareUrl) { setQrDataUrl(null); return }
    let cancelled = false
    import('qrcode').then(QR => {
      QR.toDataURL(shareUrl, { width: 144, margin: 1 }).then(url => {
        if (!cancelled) setQrDataUrl(url)
      })
    }).catch(() => { /* QR generation failed silently */ })
    return () => { cancelled = true }
  }, [shareUrl])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)

    const genotypeParsed = genotypeSchema.safeParse(profile.genotype)
    const cardData: EnhancedEmergencyCardData = {
      patientName: profile.name ?? 'Unknown',
      genotype: genotypeParsed.success ? genotypeParsed.data : null,
      medications: medications.flatMap(m => {
        const riskParsed = riskCategorySchema.safeParse(m.qtRisk)
        if (!riskParsed.success) return []
        return [{
          name: m.genericName,
          riskCategory: riskParsed.data,
          isDTA: m.isDTA,
          dosage: m.dosage ?? undefined,
          brandName: m.brandName ?? undefined,
        }]
      }),
      emergencyContacts: contacts.map(c => ({
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
      })),
      criticalNotes: [],
      generatedAt: new Date().toISOString(),
      shareSlug: '',
      ...((notesEn.trim() || notesBg.trim()) ? { personalNotes: { en: notesEn.trim(), bg: notesBg.trim() } } : {}),
    }

    try {
      const res = await fetch('/api/documents/emergency-card/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      const { url } = await res.json()
      setShareUrl(`${window.location.origin}${url}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pt-14">
        <div className="animate-pulse space-y-4">
          <div className="bg-surface-raised rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-full bg-separator-light" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-separator-light rounded w-32" />
                <div className="h-3 bg-separator-light rounded w-20" />
              </div>
              <div className="w-[72px] h-[72px] rounded-lg bg-separator-light" />
            </div>
          </div>
          <div className="bg-surface-raised rounded-2xl h-40" />
          <div className="bg-surface-raised rounded-2xl h-28" />
          <div className="bg-surface-raised rounded-2xl h-28" />
        </div>
      </div>
    )
  }

  const t = translations.en
  const genotype = profile?.genotype ?? 'UNKNOWN'
  const typeContent = t.lqtsTypes[genotype] ?? null

  return (
    <div className="max-w-lg mx-auto">
      {/* ═══════ 1. STICKY TOP BAR ═══════ */}
      <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-separator-light/50 -mx-5 px-5 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[20px] font-bold text-text-primary tracking-tight">Emergency Card</h1>
          {shareUrl && (
            <span className="inline-flex items-center gap-1 bg-[#EAFBF0] text-[#1B7A34] text-[11px] font-semibold px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Shared
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !profile}
          className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-[13px] font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.97]"
        >
          {saving ? 'Saving...' : shareUrl ? 'Update & Share' : 'Save & Share'}
        </button>
      </div>

      <div className="space-y-4">
        {/* ═══════ 2. CARD PREVIEW HERO ═══════ */}
        <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="p-5">
            <div className="flex items-center gap-4">
              {/* Patient Initials */}
              <div
                className="w-[72px] h-[72px] rounded-full flex-shrink-0 bg-gradient-to-b from-[#F07167] to-[#E05A50] flex items-center justify-center"
                style={{ boxShadow: '0 0 0 2px rgba(240,113,103,0.2)' }}
              >
                <span className="text-2xl font-bold text-white">
                  {getInitials(profile?.name ?? '?')}
                </span>
              </div>

              {/* Name / Genotype / Email */}
              <div className="flex-1 min-w-0">
                <p className="text-[18px] font-bold text-text-primary tracking-tight truncate">
                  {profile?.name ?? 'No name set'}
                </p>
                {profile?.genotype ? (
                  <span className="inline-flex items-center gap-1 mt-1 bg-coral-light text-coral-deep text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    LQTS {profile.genotype}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 mt-1 bg-[#FFF5E0] text-[#8A5600] text-[11px] font-medium px-2 py-0.5 rounded-full">
                    Set genotype in Settings
                  </span>
                )}
                <p className="text-[13px] text-text-tertiary mt-0.5 truncate">
                  {profile?.email}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR code to emergency card"
                    className="w-[72px] h-[72px] rounded-lg"
                    style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }}
                  />
                ) : (
                  <div
                    className="w-[72px] h-[72px] rounded-lg border-2 border-dashed border-separator flex items-center justify-center"
                  >
                    <span className="text-[10px] text-text-tertiary text-center leading-tight px-1">
                      Save to<br />generate
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ ERROR BANNER ═══════ */}
        {error && (
          <div className="bg-[#FFEDEC] rounded-xl px-4 py-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-[#C41E16] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-[13px] font-medium text-[#C41E16]">{error}</p>
          </div>
        )}

        {/* ═══════ 3. EDITABLE SECTIONS (iOS Settings style) ═══════ */}

        {/* — Personal Notes — */}
        <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-5 pt-4 pb-1">
            <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Personal Notes</h2>
            <p className="text-[13px] text-text-tertiary mt-1">
              Additional info for emergency responders, shown on your public card.
            </p>
          </div>
          <div className="px-5 pb-5 pt-3 space-y-3">
            <div>
              <label htmlFor="notes-en" className="block text-[13px] font-medium text-text-secondary mb-1.5">
                English
              </label>
              <textarea
                id="notes-en"
                value={notesEn}
                onChange={(e) => setNotesEn(e.target.value)}
                placeholder="Allergies, medical conditions, other notes..."
                rows={2}
                className="w-full px-3.5 py-2.5 text-[15px] border-[1.5px] border-separator rounded-xl bg-white text-text-primary placeholder:text-text-tertiary focus:border-brand focus:shadow-[0_0_0_4px_rgba(52,120,246,0.12)] outline-none resize-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="notes-bg" className="block text-[13px] font-medium text-text-secondary mb-1.5">
                Български
              </label>
              <textarea
                id="notes-bg"
                value={notesBg}
                onChange={(e) => setNotesBg(e.target.value)}
                placeholder="Алергии, медицински състояния, други бележки..."
                rows={2}
                className="w-full px-3.5 py-2.5 text-[15px] border-[1.5px] border-separator rounded-xl bg-white text-text-primary placeholder:text-text-tertiary focus:border-brand focus:shadow-[0_0_0_4px_rgba(52,120,246,0.12)] outline-none resize-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* — Emergency Contacts — */}
        <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-5 pt-4 pb-3">
            <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">
              Emergency Contacts
            </h2>
          </div>

          {contacts.length > 0 ? (
            <div>
              {contacts.map((contact, i) => (
                <div key={contact.id}>
                  {i > 0 && <div className="h-px bg-separator-light ml-5" />}
                  <div className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-[15px] font-medium text-text-primary">{contact.name}</p>
                      <p className="text-[13px] text-text-secondary capitalize">{contact.relationship}</p>
                    </div>
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-[15px] text-brand font-medium"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 pb-3">
              <p className="text-[15px] text-text-tertiary">No contacts added yet.</p>
            </div>
          )}

          <div className="h-px bg-separator-light mx-5" />
          <Link href="/settings" className="flex items-center justify-between px-5 py-3 hover:bg-surface/50 transition-colors">
            <span className="text-[15px] text-brand">Manage Contacts</span>
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {/* — Medications — */}
        <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-5 pt-4 pb-3">
            <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">
              Medications
            </h2>
          </div>

          {medications.length > 0 ? (
            <div>
              {medications.map((med, i) => {
                const risk = getRiskStyleLocal(med.qtRisk)
                return (
                  <div key={med.id}>
                    {i > 0 && <div className="h-px bg-separator-light ml-5" />}
                    <div className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-[15px] font-medium text-text-primary">{med.genericName}</p>
                        {med.brandName && (
                          <p className="text-[13px] text-text-tertiary">{med.brandName}</p>
                        )}
                        {med.dosage && (
                          <p className="text-[13px] text-text-tertiary">{med.dosage}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {med.isDTA && (
                          <span className="text-[10px] font-bold bg-[#FF3B30] text-white px-1.5 py-0.5 rounded">
                            DTA
                          </span>
                        )}
                        <span className={`${risk.bg} ${risk.text} text-[11px] font-semibold px-2 py-0.5 rounded-full`}>
                          {risk.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 pb-3">
              <p className="text-[15px] text-text-tertiary">No medications added yet.</p>
            </div>
          )}

          <div className="h-px bg-separator-light mx-5" />
          <Link href="/medications" className="flex items-center justify-between px-5 py-3 hover:bg-surface/50 transition-colors">
            <span className="text-[15px] text-brand">Manage Medications</span>
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {/* ═══════ 4. COLLAPSIBLE CARD CONTENT PREVIEW ═══════ */}
        <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Card Content Preview</h2>
            <p className="text-[13px] text-text-tertiary mt-0.5">
              Medical information shown on your public emergency card.
            </p>
          </div>

          {/* LQTS Overview */}
          <div className="h-px bg-separator-light mx-5" />
          <CollapsibleSection title="What is Long QT Syndrome">
            <div className="px-5 pb-4 space-y-3">
              {t.lqtsOverview.paragraphs.map((p, i) => (
                <p key={i} className="text-[15px] text-text-secondary leading-relaxed">{p}</p>
              ))}
            </div>
          </CollapsibleSection>

          {/* Type-Specific Info */}
          {typeContent && (
            <>
              <div className="h-px bg-separator-light mx-5" />
              <CollapsibleSection title={`${typeContent.name} Details`}>
                <div className="px-5 pb-4 space-y-4">
                  <div>
                    <p className="text-[17px] font-bold text-text-primary">{typeContent.name}</p>
                    <p className="text-[13px] text-text-tertiary mt-0.5">{typeContent.channelAffected}</p>
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-[#C41E16] uppercase tracking-wide mb-2">Triggers</p>
                    <div className="space-y-1.5">
                      {typeContent.triggers.map((trigger, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] mt-2 flex-shrink-0" />
                          <p className="text-[15px] text-text-secondary">{trigger}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-separator-light" />

                  <div>
                    <p className="text-[13px] font-semibold text-text-tertiary uppercase tracking-wide mb-1">ECG Pattern</p>
                    <p className="text-[15px] text-text-primary">{typeContent.ecgPattern}</p>
                  </div>

                  <div className="h-px bg-separator-light" />

                  <div>
                    <p className="text-[13px] font-semibold text-[#1B7A34] uppercase tracking-wide mb-1">Treatment</p>
                    <p className="text-[15px] text-text-primary">{typeContent.treatment}</p>
                  </div>
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* General Precautions (for OTHER/UNKNOWN) */}
          {(!typeContent || genotype === 'OTHER' || genotype === 'UNKNOWN') && (
            <>
              <div className="h-px bg-separator-light mx-5" />
              <CollapsibleSection title="General Precautions">
                <div className="px-5 pb-4">
                  <div className="bg-[#FFF5E0] rounded-xl p-4 space-y-2">
                    {t.generalPrecautions.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A] mt-2 flex-shrink-0" />
                        <p className="text-[15px] text-[#8A5600]">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Emergency Protocol */}
          <div className="h-px bg-separator-light mx-5" />
          <CollapsibleSection title="Emergency Protocol">
            <div className="mx-5 mb-4 rounded-xl overflow-hidden" style={{ border: '2px solid #DC2626' }}>
              {/* Red alert banner */}
              <div className="bg-[#DC2626] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-white tracking-tight leading-tight">
                      {t.emergencyProtocol.title}
                    </h3>
                    <p className="text-[12px] text-white/80 mt-0.5 leading-snug">
                      {t.emergencyProtocol.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Immediate steps */}
              <div className="bg-white px-4 py-3">
                <div className="space-y-3">
                  {t.emergencyProtocol.immediateSteps.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#DC2626] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[12px] font-extrabold text-white">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[#1a1a1a] leading-snug">{item.step}</p>
                        <p className="text-[12px] text-[#555] leading-relaxed mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DO NOT section */}
              <div className="bg-[#FEF2F2] px-4 py-3" style={{ borderTop: '1px solid #FECACA' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <h4 className="text-[13px] font-extrabold text-[#DC2626] uppercase tracking-wide">DO NOT ADMINISTER</h4>
                </div>
                <div className="space-y-1.5">
                  {t.emergencyProtocol.doNotDo.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-[#DC2626] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-[12px] text-[#991B1B] leading-snug font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Torsades protocol */}
              <div className="bg-[#FFF7ED] px-4 py-3" style={{ borderTop: '1px solid #FED7AA' }}>
                <h4 className="text-[13px] font-extrabold text-[#9A3412] uppercase tracking-wide mb-1">
                  {t.emergencyProtocol.torsadesProtocol.title}
                </h4>
                <p className="text-[12px] text-[#9A3412]/70 mb-2 leading-snug">
                  {t.emergencyProtocol.torsadesProtocol.description}
                </p>
                <div className="space-y-1.5">
                  {t.emergencyProtocol.torsadesProtocol.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[11px] font-bold text-[#9A3412] bg-[#FFEDD5] w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <p className="text-[12px] text-[#7C2D12] leading-snug font-medium">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Genotype-specific notes */}
              {t.emergencyProtocol.genotypeNotes[genotype] && (
                <div className="bg-[#F0F9FF] px-4 py-3" style={{ borderTop: '1px solid #BAE6FD' }}>
                  <h4 className="text-[13px] font-extrabold text-[#0C4A6E] uppercase tracking-wide mb-2">
                    {t.emergencyProtocol.genotypeNotes[genotype].title}
                  </h4>
                  <div className="space-y-1.5">
                    {t.emergencyProtocol.genotypeNotes[genotype].notes.map((note, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] mt-1.5 flex-shrink-0" />
                        <p className="text-[12px] text-[#0C4A6E] leading-snug font-medium">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Lifestyle Guidance (combines Do + Don't) */}
          {typeContent && (
            <>
              <div className="h-px bg-separator-light mx-5" />
              <CollapsibleSection title="Lifestyle Guidance">
                <div className="px-5 pb-4 space-y-4">
                  {/* What to Do */}
                  <div>
                    <p className="text-[13px] font-semibold text-[#1B7A34] uppercase tracking-wide mb-2">
                      {t.sections.whatToDo}
                    </p>
                    <div className="space-y-2">
                      {typeContent.guidance.do.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-[#EAFBF0] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-3 h-3 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </div>
                          <p className="text-[15px] text-text-secondary">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-separator-light" />

                  {/* What NOT to Do */}
                  <div>
                    <p className="text-[13px] font-semibold text-[#C41E16] uppercase tracking-wide mb-2">
                      {t.sections.whatNotToDo}
                    </p>
                    <div className="space-y-2">
                      {typeContent.guidance.dont.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-[#FFEDEC] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-3 h-3 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <p className="text-[15px] text-text-secondary">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Restrictions */}
          {typeContent && typeContent.restrictions.length > 0 && (
            <>
              <div className="h-px bg-separator-light mx-5" />
              <CollapsibleSection title="Restrictions">
                <div className="px-5 pb-4">
                  <div className="bg-[#FFEDEC] rounded-xl p-4 space-y-2">
                    {typeContent.restrictions.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] mt-2 flex-shrink-0" />
                        <p className="text-[15px] text-[#C41E16]">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleSection>
            </>
          )}
        </div>

        {/* ═══════ 5. SHARE PANEL ═══════ */}
        {shareUrl && (
          <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-[15px] font-semibold text-text-primary">Card Shared</h2>
              </div>
              <p className="text-[13px] text-text-secondary mt-1">
                Anyone with this link can view your emergency card.
              </p>
            </div>

            <div className="px-5 pb-4 flex items-center gap-2">
              <code className="flex-1 text-[13px] bg-surface rounded-lg px-3 py-2 text-text-secondary truncate">
                {shareUrl}
              </code>
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-brand hover:bg-brand-hover text-white text-[13px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="h-px bg-separator-light mx-5" />
            <a
              href={shareUrl.replace(window.location.origin, '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-3 hover:bg-surface/50 transition-colors"
            >
              <span className="text-[15px] text-brand">View Public Card</span>
              <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        )}

        {/* Bottom spacer for mobile */}
        <div className="h-4" />
      </div>
    </div>
  )
}
