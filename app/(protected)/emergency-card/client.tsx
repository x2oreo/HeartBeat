'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { EnhancedEmergencyCardData, RiskCategory } from '@/types'
import { translations } from '@/lib/translations/emergency-card'

type ProfileData = {
  name: string | null
  email: string
  genotype: string | null
}

type ContactData = {
  id: string
  name: string
  phone: string
  relationship: string
}

type MedicationData = {
  id: string
  genericName: string
  brandName: string | null
  dosage: string | null
  qtRisk: string
  isDTA: boolean
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height) {
          if (width > maxSize) { height = (height * maxSize) / width; width = maxSize }
        } else {
          if (height > maxSize) { width = (width * maxSize) / height; height = maxSize }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function getRiskStyle(risk: string) {
  switch (risk) {
    case 'KNOWN_RISK': return { bg: 'bg-[#FFEDEC]', text: 'text-[#C41E16]', label: 'Known Risk' }
    case 'POSSIBLE_RISK': return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', label: 'Possible Risk' }
    case 'CONDITIONAL_RISK': return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', label: 'Conditional' }
    default: return { bg: 'bg-[#EAFBF0]', text: 'text-[#1B7A34]', label: 'Not Listed' }
  }
}

export function EmergencyCardClient() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [contacts, setContacts] = useState<ContactData[]>([])
  const [medications, setMedications] = useState<MedicationData[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [notesEn, setNotesEn] = useState('')
  const [notesBg, setNotesBg] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          setProfile({ name: profileRes.name, email: profileRes.email, genotype: profileRes.genotype })
        }
        if (Array.isArray(contactsRes)) setContacts(contactsRes)
        if (Array.isArray(medsRes)) setMedications(medsRes)

        if (existingRes && !existingRes.error) {
          if (existingRes.patientPhoto) setPhoto(existingRes.patientPhoto)
          if (existingRes.personalNotes) {
            setNotesEn(existingRes.personalNotes.en ?? '')
            setNotesBg(existingRes.personalNotes.bg ?? '')
          }
          if (existingRes.shareSlug) {
            setShareUrl(`${window.location.origin}/emergency-card/${existingRes.shareSlug}`)
          }
        }
      } catch {
        // Silent fail on load
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    try {
      const resized = await resizeImage(file, 200)
      setPhoto(resized)
    } catch { /* silent */ }
  }, [])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)

    const cardData: EnhancedEmergencyCardData = {
      patientName: profile.name ?? 'Unknown',
      genotype: (profile.genotype as EnhancedEmergencyCardData['genotype']) ?? null,
      medications: medications.map(m => ({
        name: m.genericName,
        riskCategory: m.qtRisk as RiskCategory,
        isDTA: m.isDTA,
        dosage: m.dosage ?? undefined,
        brandName: m.brandName ?? undefined,
      })),
      emergencyContacts: contacts.map(c => ({
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
      })),
      criticalNotes: [],
      generatedAt: new Date().toISOString(),
      shareSlug: '',
      ...(photo ? { patientPhoto: photo } : {}),
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

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 pt-2">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-separator-light rounded-lg w-40" />
          <div className="bg-surface-raised rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-separator-light" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-separator-light rounded w-32" />
                <div className="h-3 bg-separator-light rounded w-20" />
              </div>
            </div>
          </div>
          <div className="bg-surface-raised rounded-2xl h-32" />
          <div className="bg-surface-raised rounded-2xl h-24" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pt-2">
      {/* Page Title */}
      <div className="px-1 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Emergency Card</h1>
          <p className="text-[15px] text-text-secondary mt-0.5">
            Share this card with doctors and paramedics.
          </p>
        </div>
        {shareUrl && (
          <button
            onClick={handleCopy}
            className="mt-1 p-2 rounded-xl hover:bg-surface-raised active:scale-95 transition-all cursor-pointer"
            title="Copy share link"
          >
            {copied ? (
              <svg className="w-5 h-5 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Patient Info Card */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-4">
            {/* Photo */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-[72px] h-[72px] rounded-full bg-surface flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer group"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}
            >
              {photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-[#E8E8ED] to-[#D1D1D6] flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-full transition-all" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-semibold text-text-primary truncate">
                {profile?.name ?? 'No name set'}
              </p>
              <p className="text-[13px] text-text-secondary truncate mt-0.5">
                {profile?.email}
              </p>
              {profile?.genotype ? (
                <span className="inline-flex items-center gap-1 mt-2 bg-coral-light text-coral-deep text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  LQTS {profile.genotype}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-2 bg-[#FFF5E0] text-[#8A5600] text-[11px] font-medium px-2 py-0.5 rounded-full">
                  Set genotype in Settings
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-px bg-separator-light mx-5" />

        <Link href="/settings" className="flex items-center justify-between px-5 py-3 hover:bg-surface/50 transition-colors">
          <span className="text-[15px] text-brand">Edit Profile & Genotype</span>
          <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* ===== LQTS DISEASE INFO ===== */}
      {(() => {
        const t = translations.en
        const genotype = profile?.genotype ?? 'UNKNOWN'
        const typeContent = t.lqtsTypes[genotype] ?? null

        return (
          <>
            {/* What is LQTS */}
            <div className="bg-surface-raised rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
                {t.lqtsOverview.title}
              </h2>
              <div className="space-y-3">
                {t.lqtsOverview.paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] text-text-secondary leading-relaxed">{p}</p>
                ))}
              </div>
            </div>

            {/* Type-Specific Info */}
            {typeContent && (
              <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="p-5 space-y-4">
                  <div>
                    <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
                      {t.sections.myType}
                    </h2>
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
              </div>
            )}

            {/* General precautions for OTHER/UNKNOWN */}
            {(!typeContent || genotype === 'OTHER' || genotype === 'UNKNOWN') && (
              <div className="bg-[#FFF5E0] rounded-2xl p-5">
                <h2 className="text-[13px] font-semibold text-[#8A5600] uppercase tracking-wide mb-3">
                  {t.generalPrecautions.title}
                </h2>
                <div className="space-y-2">
                  {t.generalPrecautions.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A] mt-2 flex-shrink-0" />
                      <p className="text-[15px] text-[#8A5600]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Protocol */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #DC2626' }}>
              <div className="bg-[#DC2626] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-extrabold text-white tracking-tight leading-tight">
                      {t.emergencyProtocol.title}
                    </h2>
                    <p className="text-[13px] text-white/80 mt-0.5 leading-snug">
                      {t.emergencyProtocol.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white px-5 py-4">
                <div className="space-y-4">
                  {t.emergencyProtocol.immediateSteps.map((item, i) => (
                    <div key={i} className="flex gap-3.5">
                      <div className="w-7 h-7 rounded-full bg-[#DC2626] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[13px] font-extrabold text-white">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#1a1a1a] leading-snug">{item.step}</p>
                        <p className="text-[13px] text-[#555] leading-relaxed mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FEF2F2] px-5 py-4" style={{ borderTop: '1px solid #FECACA' }}>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <h3 className="text-[14px] font-extrabold text-[#DC2626] uppercase tracking-wide">DO NOT ADMINISTER</h3>
                </div>
                <div className="space-y-2">
                  {t.emergencyProtocol.doNotDo.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-[13px] text-[#991B1B] leading-snug font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FFF7ED] px-5 py-4" style={{ borderTop: '1px solid #FED7AA' }}>
                <h3 className="text-[14px] font-extrabold text-[#9A3412] uppercase tracking-wide mb-1">
                  {t.emergencyProtocol.torsadesProtocol.title}
                </h3>
                <p className="text-[13px] text-[#9A3412]/70 mb-3 leading-snug">
                  {t.emergencyProtocol.torsadesProtocol.description}
                </p>
                <div className="space-y-2">
                  {t.emergencyProtocol.torsadesProtocol.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-[12px] font-bold text-[#9A3412] bg-[#FFEDD5] w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <p className="text-[13px] text-[#7C2D12] leading-snug font-medium">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {t.emergencyProtocol.genotypeNotes[genotype] && (
                <div className="bg-[#F0F9FF] px-5 py-4" style={{ borderTop: '1px solid #BAE6FD' }}>
                  <h3 className="text-[14px] font-extrabold text-[#0C4A6E] uppercase tracking-wide mb-2.5">
                    {t.emergencyProtocol.genotypeNotes[genotype].title}
                  </h3>
                  <div className="space-y-2">
                    {t.emergencyProtocol.genotypeNotes[genotype].notes.map((note, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] mt-2 flex-shrink-0" />
                        <p className="text-[13px] text-[#0C4A6E] leading-snug font-medium">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* What to Do */}
            {typeContent && (
              <div className="bg-surface-raised rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 className="text-[13px] font-semibold text-[#1B7A34] uppercase tracking-wide mb-3">
                  {t.sections.whatToDo}
                </h2>
                <div className="space-y-2.5">
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
            )}

            {/* What NOT to Do */}
            {typeContent && (
              <div className="bg-surface-raised rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 className="text-[13px] font-semibold text-[#C41E16] uppercase tracking-wide mb-3">
                  {t.sections.whatNotToDo}
                </h2>
                <div className="space-y-2.5">
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
            )}

            {/* Restrictions */}
            {typeContent && typeContent.restrictions.length > 0 && (
              <div className="bg-[#FFEDEC] rounded-2xl p-5">
                <h2 className="text-[13px] font-semibold text-[#C41E16] uppercase tracking-wide mb-3">
                  {t.sections.restrictions}
                </h2>
                <div className="space-y-2">
                  {typeContent.restrictions.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] mt-2 flex-shrink-0" />
                      <p className="text-[15px] text-[#C41E16]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* Emergency Contacts */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
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

      {/* Current Medications */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">
            Medications
          </h2>
        </div>

        {medications.length > 0 ? (
          <div>
            {medications.map((med, i) => {
              const risk = getRiskStyle(med.qtRisk)
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
                    <span className={`${risk.bg} ${risk.text} text-[11px] font-semibold px-2 py-0.5 rounded-full`}>
                      {risk.label}
                    </span>
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

      {/* Personal Notes */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">
            Personal Notes
          </h2>
          <p className="text-[13px] text-text-tertiary mt-1">
            Additional info for emergency responders, shown on your public card.
          </p>
        </div>

        <div className="px-5 pb-5 space-y-3">
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

      {/* Error */}
      {error && (
        <div className="bg-[#FFEDEC] rounded-xl px-4 py-3">
          <p className="text-[13px] font-medium text-[#C41E16]">{error}</p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !profile}
        className="w-full py-3.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-[15px] font-semibold rounded-xl transition-colors cursor-pointer"
      >
        {saving ? 'Saving...' : shareUrl ? 'Update & Share' : 'Save & Share'}
      </button>

      {/* Share Link */}
      {shareUrl && (
        <div className="bg-surface-raised rounded-2xl overflow-hidden">
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
    </div>
  )
}
