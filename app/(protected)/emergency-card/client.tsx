'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEmergencyCard } from '@/hooks/use-documents'
import { EmergencyCardPDFButton } from '@/components/documents/PDFGenerator'

type ProfileData = {
  name: string | null
  email: string
  genotype: string | null
  emergencyContacts: { id: string; name: string; phone: string; relationship: string }[]
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

export function EmergencyCardClient() {
  const { cardData, isGenerating, error, generate, share, loadExisting } = useEmergencyCard()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [notesEn, setNotesEn] = useState('')
  const [notesBg, setNotesBg] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile and existing card
  useEffect(() => {
    async function load() {
      setLoadingProfile(true)
      try {
        const [profileRes, existingCard] = await Promise.all([
          fetch('/api/onboarding').then(r => r.ok ? r.json() : null),
          loadExisting(),
        ])
        if (profileRes) {
          setProfile({
            name: profileRes.name,
            email: profileRes.email,
            genotype: profileRes.genotype,
            emergencyContacts: profileRes.emergencyContacts ?? [],
          })
        }
        if (existingCard) {
          if (existingCard.patientPhoto) setPhoto(existingCard.patientPhoto)
          if (existingCard.personalNotes) {
            setNotesEn(existingCard.personalNotes.en)
            setNotesBg(existingCard.personalNotes.bg)
          }
          if (existingCard.shareSlug) {
            setShareUrl(`${window.location.origin}/emergency-card/${existingCard.shareSlug}`)
          }
        }
      } catch {
        // Silent fail
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [loadExisting])

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    try {
      const resized = await resizeImage(file, 200)
      setPhoto(resized)
    } catch {
      // Silent fail
    }
  }, [])

  async function handleGenerate() {
    const extras: { patientPhoto?: string; personalNotes?: { en: string; bg: string } } = {}
    if (photo) extras.patientPhoto = photo
    if (notesEn.trim() || notesBg.trim()) {
      extras.personalNotes = { en: notesEn.trim(), bg: notesBg.trim() }
    }
    const result = await generate(extras)
    if (result) {
      // Auto-share after generation
      const url = await share(result)
      if (url) setShareUrl(`${window.location.origin}${url}`)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-separator-light rounded w-1/3 mb-2" />
          <div className="h-4 bg-separator-light rounded w-2/3 mb-6" />
          <div className="bg-surface-raised rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-separator-light" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-separator-light rounded w-1/2" />
                <div className="h-3 bg-separator-light rounded w-1/3" />
              </div>
            </div>
            <div className="h-24 bg-surface rounded-xl" />
            <div className="h-24 bg-surface rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Emergency Card</h1>
        <p className="text-sm text-text-secondary mt-1">
          Create a shareable emergency card for ER doctors and paramedics.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-surface-raised rounded-2xl card-shadow overflow-hidden">
        {/* Photo + Patient Info Section */}
        <div className="p-5 border-b border-separator-light">
          <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            Patient Information
          </h2>
          <div className="flex items-start gap-4">
            {/* Photo Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-surface border-2 border-dashed border-separator flex-shrink-0 flex items-center justify-center overflow-hidden hover:border-brand transition-colors cursor-pointer group"
            >
              {photo ? (
                <img src={photo} alt="Patient" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-text-tertiary group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-full transition-colors flex items-center justify-center">
                {photo && (
                  <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </button>

            {/* Name, Email, Genotype */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-text-primary truncate">
                {profile?.name ?? 'No name set'}
              </p>
              <p className="text-sm text-text-secondary truncate">
                {profile?.email}
              </p>
              {profile?.genotype && (
                <span className="inline-block mt-1.5 bg-coral-light text-coral-deep text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  LQTS {profile.genotype}
                </span>
              )}
              {!profile?.genotype && (
                <span className="inline-block mt-1.5 bg-[#FFF5E0] text-[#8A5600] text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Genotype not set
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3">
            Tap the photo area to upload a picture. Edit your name or genotype in{' '}
            <a href="/settings" className="text-brand hover:underline">Settings</a>.
          </p>
        </div>

        {/* Emergency Contacts */}
        <div className="p-5 border-b border-separator-light">
          <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-text-tertiary" />
            Emergency Contacts
          </h2>
          {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? (
            <div className="space-y-2">
              {profile.emergencyContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between text-sm bg-surface rounded-xl px-3 py-2.5">
                  <div>
                    <span className="font-medium text-text-primary">{contact.name}</span>
                    <span className="text-text-tertiary ml-2 text-xs capitalize">{contact.relationship}</span>
                  </div>
                  <span className="text-text-secondary text-sm">{contact.phone}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No emergency contacts added yet.</p>
          )}
          <p className="text-xs text-text-tertiary mt-2">
            Manage contacts in{' '}
            <a href="/settings" className="text-brand hover:underline">Settings</a>.
          </p>
        </div>

        {/* Personal Notes — Bilingual */}
        <div className="p-5">
          <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            Personal Notes
          </h2>
          <p className="text-xs text-text-secondary mb-3">
            Add any additional information for emergency responders. This will appear on your public emergency card in both languages.
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="notes-en" className="block text-xs font-medium text-text-secondary mb-1">
                English
              </label>
              <textarea
                id="notes-en"
                value={notesEn}
                onChange={(e) => setNotesEn(e.target.value)}
                placeholder="Any additional medical info, allergies, or notes for ER staff..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-separator rounded-xl bg-white text-text-primary placeholder:text-text-tertiary focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none resize-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="notes-bg" className="block text-xs font-medium text-text-secondary mb-1">
                Български
              </label>
              <textarea
                id="notes-bg"
                value={notesBg}
                onChange={(e) => setNotesBg(e.target.value)}
                placeholder="Допълнителна медицинска информация, алергии или бележки за спешната помощ..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-separator rounded-xl bg-white text-text-primary placeholder:text-text-tertiary focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none resize-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-[#FFEDEC] border border-[#FF3B30]/20 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[#C41E16]">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-sm text-[#FF3B30] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Generate / Update Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-coral-deep hover:bg-coral disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
      >
        {isGenerating ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating...
          </>
        ) : cardData ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate Card
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Emergency Card
          </>
        )}
      </button>

      {/* Card Generated — Share Section */}
      {cardData && !isGenerating && (
        <div className="space-y-4">
          {/* Share URL */}
          {shareUrl && (
            <div className="bg-[#EAFBF0] border border-[#34C759]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-[#1B7A34]">
                  Card generated & shared
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-surface-raised border border-[#34C759]/20 rounded-lg px-3 py-2 text-text-secondary truncate">
                  {shareUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-[#34C759] hover:bg-[#2DA44E] text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-[#1B7A34]/70 mt-2">
                Anyone with this link can view the card — no login required. Share with your ER or cardiologist.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <EmergencyCardPDFButton data={cardData} shareUrl={shareUrl ?? undefined} />

            {shareUrl && (
              <a
                href={shareUrl.replace(window.location.origin, '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View Public Card
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
