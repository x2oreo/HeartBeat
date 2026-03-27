'use client'

import { useState, useEffect } from 'react'
import { useDoctorPrep } from '@/hooks/use-documents'
import { DoctorPrepView } from '@/components/documents/DoctorPrepView'
import { DoctorPrepPDFButton } from '@/components/documents/PDFGenerator'
import { DocumentThumbnail } from '@/components/documents/DocumentThumbnail'
import type { DoctorSpecialty, DocumentLanguage, SavedDoctorPrepDocumentWithPreview } from '@/types'

// ── Specialty Icons (SVG paths) ──────────────────────────────────

function SpecialtyIcon({ specialty, className = 'w-6 h-6' }: { specialty: DoctorSpecialty | string; className?: string }) {
  const props = { className, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5 }

  switch (specialty) {
    case 'Cardiologist':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )
    case 'Dentist':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2.5 0-4.5 1-5.5 2.5S5 8.5 5 10c0 2 .5 3.5 1.5 5s1.5 4 1.5 6h2c0-1 .5-3 2-3s2 2 2 3h2c0-2 .5-4.5 1.5-6s1.5-3 1.5-5c0-1.5-.5-3-1.5-4.5S14.5 3 12 3z" />
        </svg>
      )
    case 'General Practitioner':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 10v4m2-2h-4" />
        </svg>
      )
    case 'Surgeon':
      return (
        <svg {...props}>
          {/* Scalpel icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75L4.5 13.5c-.75.75-.75 2.25.75 3s2.25.75 3-.75l6-9.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75l3 3-2.25 2.25" />
        </svg>
      )
    case 'Anesthesiologist':
      return (
        <svg {...props}>
          {/* Syringe/injection icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-2 2m0 0l-3.5 3.5m3.5-3.5l2-2m-2 2l-2-2M14 10l-7 7-2.25 2.25M14 10l-1.5-1.5M7 17l-1.25 1.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 11.5l3 3M8 13l3 3M6.5 14.5l3 3" />
        </svg>
      )
    case 'Psychiatrist':
      return (
        <svg {...props}>
          {/* Brain icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75v16.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c-1.5 0-3 .75-3.75 2-.5 1-.25 2.25.25 3-.75.25-1.75 1-2 2.25-.25 1.25.25 2.5 1 3.25-.5.75-.75 2-.25 3.25.5 1.25 1.75 2 3 2.25.5.25 1.25.25 1.75.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c1.5 0 3 .75 3.75 2 .5 1 .25 2.25-.25 3 .75.25 1.75 1 2 2.25.25 1.25-.25 2.5-1 3.25.5.75.75 2 .25 3.25-.5 1.25-1.75 2-3 2.25-.5.25-1.25.25-1.75.25" />
        </svg>
      )
    case 'ENT':
      return (
        <svg {...props}>
          {/* Ear icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18c0 1.657 1.343 3 3 3s3-1.343 3-3v-1.5c0-.828.672-1.5 1.5-1.5s1.5-.672 1.5-1.5V12c0-3.866-3.134-7-7-7S1 8.134 1 12" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 00-3-3" />
        </svg>
      )
    case 'Gastroenterologist':
      return (
        <svg {...props}>
          {/* Stomach icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 5.5c0-1.38-1.12-2.5-2.5-2.5H9a3 3 0 00-3 3v3c0 2.5 1.5 4 3 5s2 2.5 2 4.5v0c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V16" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 5.5v5c0 1.5-.5 3-2 4" />
        </svg>
      )
    case 'Dermatologist':
      return (
        <svg {...props}>
          {/* Hand/skin icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0v5.1m3.15-6.6v3m0 0v2.1m0-2.1a1.575 1.575 0 013.15 0v2.1m0 0v2.4a6.3 6.3 0 01-6.3 6.3H9.75a6.3 6.3 0 01-6.3-6.3v-2.4c0-.87.705-1.575 1.575-1.575h.9" />
          <circle cx="10" cy="14" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="13" cy="12.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'Ophthalmologist':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default: // 'Other'
      return (
        <svg {...props}>
          {/* Stethoscope icon */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5v3a4.5 4.5 0 009 0v-3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h3M17.25 4.5h-3" />
          <circle cx="18.75" cy="12" r="2.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 14.25v1.5a4.5 4.5 0 01-4.5 4.5h-1.5a4.5 4.5 0 01-4.5-4.5v-1.5" />
        </svg>
      )
  }
}

// ── Specialty Accent Colors ──────────────────────────────────────

function getSpecialtyAccent(specialty: string): { color: string; bg: string } {
  switch (specialty) {
    case 'Cardiologist': return { color: '#F07167', bg: '#FFF0EE' }
    case 'Dentist': return { color: '#32AFA9', bg: '#E8F8F7' }
    case 'General Practitioner': return { color: '#3478F6', bg: '#EBF2FF' }
    case 'Surgeon': return { color: '#1A56C4', bg: '#E3EDFF' }
    case 'Anesthesiologist': return { color: '#8B5CF6', bg: '#F3F0FF' }
    case 'Psychiatrist': return { color: '#6366F1', bg: '#EEEEFF' }
    case 'ENT': return { color: '#F59E0B', bg: '#FFF8E1' }
    case 'Gastroenterologist': return { color: '#10B981', bg: '#ECFDF5' }
    case 'Dermatologist': return { color: '#EC4899', bg: '#FDF2F8' }
    case 'Ophthalmologist': return { color: '#0EA5E9', bg: '#F0F9FF' }
    default: return { color: '#6E6E73', bg: '#F2F2F7' }
  }
}

// ── Constants ────────────────────────────────────────────────────

const SPECIALTY_OPTIONS: { value: DoctorSpecialty; label: string }[] = [
  { value: 'Cardiologist', label: 'Cardiologist' },
  { value: 'Dentist', label: 'Dentist' },
  { value: 'General Practitioner', label: 'General Practitioner' },
  { value: 'Surgeon', label: 'Surgeon' },
  { value: 'Anesthesiologist', label: 'Anesthesiologist' },
  { value: 'Psychiatrist', label: 'Psychiatrist' },
  { value: 'ENT', label: 'ENT' },
  { value: 'Gastroenterologist', label: 'Gastroenterologist' },
  { value: 'Dermatologist', label: 'Dermatologist' },
  { value: 'Ophthalmologist', label: 'Ophthalmologist' },
  { value: 'Other', label: 'Other' },
]

const LANGUAGE_OPTIONS: { value: DocumentLanguage; label: string; flag?: string }[] = [
  { value: 'English', label: 'English', flag: 'EN' },
  { value: 'Bulgarian', label: '\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438', flag: 'BG' },
  { value: 'German', label: 'Deutsch', flag: 'DE' },
  { value: 'French', label: 'Fran\u00E7ais', flag: 'FR' },
  { value: 'Spanish', label: 'Espa\u00F1ol', flag: 'ES' },
  { value: 'Italian', label: 'Italiano', flag: 'IT' },
  { value: 'Portuguese', label: 'Portugu\u00EAs', flag: 'PT' },
  { value: 'Turkish', label: 'T\u00FCrk\u00E7e', flag: 'TR' },
  { value: 'Arabic', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: 'AR' },
  { value: 'Chinese', label: '\u4E2D\u6587', flag: 'ZH' },
  { value: 'Japanese', label: '\u65E5\u672C\u8A9E', flag: 'JA' },
  { value: 'Korean', label: '\uD55C\uAD6D\uC5B4', flag: 'KO' },
  { value: 'Other', label: 'Other' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(iso)
}

// ── Main Component ───────────────────────────────────────────────

type View = 'dashboard' | 'create' | 'view'

export function DoctorPrepClient() {
  const {
    documents,
    isLoadingList,
    prepData,
    isGenerating,
    error,
    fetchDocuments,
    generate,
    loadDocument,
    deleteDocument,
    clearView,
  } = useDoctorPrep()

  const [view, setView] = useState<View>('dashboard')
  const [specialty, setSpecialty] = useState<DoctorSpecialty>('General Practitioner')
  const [customSpecialty, setCustomSpecialty] = useState('')
  const [language, setLanguage] = useState<DocumentLanguage>('English')
  const [customLanguage, setCustomLanguage] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  async function handleGenerate() {
    const result = await generate({
      doctorSpecialty: specialty,
      customSpecialty: specialty === 'Other' ? customSpecialty.trim() || null : null,
      language,
      customLanguage: language === 'Other' ? customLanguage.trim() || null : null,
    })
    if (result) setView('view')
  }

  async function handleLoadDocument(doc: SavedDoctorPrepDocumentWithPreview) {
    const result = await loadDocument(doc.id)
    if (result) setView('view')
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteDocument(id)
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  function goToDashboard() {
    clearView()
    setView('dashboard')
  }

  function goToCreate() {
    setView('create')
  }

  // ── Dashboard View ─────────────────────────────────────────────

  if (view === 'dashboard') {
    const sortedDocs = [...documents].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    )

    return (
      <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Doctor Documents
            </h1>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              Medication safety briefs for your doctor visits
            </p>
          </div>
          <button
            onClick={goToCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer shadow-[0_2px_12px_rgba(52,120,246,0.2)] hover:shadow-[0_4px_20px_rgba(52,120,246,0.3)] flex-shrink-0 active:scale-[0.97]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">New Document</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Loading Skeletons — gallery grid */}
        {isLoadingList && (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-xl overflow-hidden bg-surface-raised border border-separator-light">
                {/* Header — matches DocumentThumbnail header */}
                <div className="bg-brand/60 px-3 py-2 space-y-1.5">
                  <div className="h-3 bg-white/20 rounded w-3/5" />
                  <div className="h-2.5 bg-white/15 rounded w-2/5" />
                </div>
                {/* Summary lines */}
                <div className="px-3 py-2.5 space-y-1.5">
                  <div className="h-2.5 bg-separator-light rounded w-full" />
                  <div className="h-2.5 bg-separator-light rounded w-5/6" />
                  <div className="h-2.5 bg-separator-light rounded w-4/6" />
                  <div className="h-2.5 bg-separator-light rounded w-3/6" />
                </div>
                {/* Footer stat pills */}
                <div className="px-3 pb-2.5 flex gap-1">
                  <div className="h-4 bg-separator-light rounded w-12" />
                  <div className="h-4 bg-separator-light rounded w-14" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingList && documents.length === 0 && (
          <div className="bg-surface-raised rounded-2xl card-shadow p-8 text-center animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-5 relative">
              <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 w-14 h-18 rounded-xl bg-separator-light border border-separator" />
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 w-14 h-18 rounded-xl bg-brand-light border border-brand/20" />
              <div className="relative w-14 h-18 rounded-xl bg-surface-raised border border-separator-light flex items-center justify-center shadow-sm">
                <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1.5">
              No documents yet
            </h3>
            <p className="text-sm text-text-secondary mb-6 max-w-xs mx-auto leading-relaxed">
              Create your first doctor visit preparation document to share your LQTS medication safety information.
            </p>
            <button
              onClick={goToCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer shadow-[0_2px_12px_rgba(52,120,246,0.2)] active:scale-[0.97]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create First Document
            </button>
          </div>
        )}

        {/* Gallery Grid */}
        {!isLoadingList && sortedDocs.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {sortedDocs.map((doc, i) => {
              const displayName = doc.doctorSpecialty === 'Other' && doc.customSpecialty
                ? doc.customSpecialty
                : doc.doctorSpecialty

              return (
                <div
                  key={doc.id}
                  className="group relative animate-fade-in-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <button
                    onClick={() => handleLoadDocument(doc)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="group-hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden group-hover:ring-2 group-hover:ring-brand/20">
                      <DocumentThumbnail
                        specialty={displayName}
                        patientName={doc.patientName}
                        genotype={doc.genotype}
                        medicationNames={doc.medicationNames}
                        avoidCount={doc.avoidCount}
                        warningCount={doc.warningCount}
                        summary={doc.summary}
                      />
                    </div>
                    {/* Date below card */}
                    <p className="text-[11px] text-text-tertiary mt-2 px-1">
                      {formatRelativeDate(doc.generatedAt)}
                    </p>
                  </button>

                  {/* Delete button — lightly visible on mobile, hover-only on desktop */}
                  <div className="absolute top-1.5 right-1.5 opacity-40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 z-10">
                    {confirmDeleteId === doc.id ? (
                      <div className="flex items-center gap-1 bg-surface-raised rounded-lg shadow-lg border border-separator-light p-1">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="px-2 py-1 text-[11px] font-medium text-[#FF3B30] hover:bg-[#FFEDEC] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === doc.id ? '...' : 'Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-1 text-[11px] text-text-secondary hover:bg-surface rounded-md transition-colors cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDeleteId(doc.id)
                        }}
                        className="w-6 h-6 rounded-lg bg-surface-raised/90 hover:bg-[#FFEDEC] border border-separator-light flex items-center justify-center transition-colors cursor-pointer shadow-sm backdrop-blur-sm"
                        title="Delete document"
                      >
                        <svg className="w-3 h-3 text-text-tertiary hover:text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    )
  }

  // ── Create View ────────────────────────────────────────────────

  if (view === 'create') {
    const specialtySelected = specialty !== 'Other' || customSpecialty.trim().length > 0
    const canGenerate = specialtySelected && !isGenerating

    return (
      <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6">
        {/* Back + Header */}
        <div className="animate-fade-in-up">
          <button
            onClick={goToDashboard}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to documents
          </button>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            New Document
          </h1>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            Select the type of doctor and the language for your medication safety brief.
          </p>
        </div>

        {/* Generation in progress */}
        {isGenerating && (
          <div className="animate-fade-in-up">
            <div className="bg-surface-raised rounded-2xl card-shadow overflow-hidden">
              {/* Shimmer header */}
              <div className="h-16 bg-brand-light shimmer-bg" />
              <div className="p-6 space-y-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-separator-light rounded-lg w-2/3" />
                  <div className="h-4 bg-surface rounded-lg w-full" />
                  <div className="h-4 bg-surface rounded-lg w-full" />
                  <div className="h-4 bg-surface rounded-lg w-4/5" />
                </div>
                <div className="animate-pulse space-y-3 pt-2">
                  <div className="h-5 bg-separator-light rounded-lg w-1/3" />
                  <div className="h-20 bg-surface rounded-xl" />
                </div>
                <div className="animate-pulse space-y-3 pt-2">
                  <div className="h-5 bg-separator-light rounded-lg w-2/5" />
                  <div className="h-14 bg-surface rounded-xl" />
                  <div className="h-14 bg-surface rounded-xl" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-5">
              <svg className="w-4 h-4 text-brand animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-text-secondary font-medium">
                Generating your doctor preparation document...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isGenerating && (
          <div className="bg-[#FFEDEC] border border-[#FF3B30]/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up">
            <svg className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#C41E16]">{error}</p>
              <button
                onClick={handleGenerate}
                className="mt-2 text-sm font-medium text-[#FF3B30] hover:underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {!isGenerating && (
          <div className="space-y-5">
            {/* Step 1 — Doctor Specialty */}
            <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Doctor Specialty</h2>
                  <p className="text-xs text-text-tertiary mt-0.5">What type of doctor are you visiting?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SPECIALTY_OPTIONS.map((opt) => {
                  const isSelected = specialty === opt.value
                  const accent = getSpecialtyAccent(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSpecialty(opt.value)}
                      className={`
                        relative flex items-center gap-2.5 px-3 py-3 rounded-xl text-left cursor-pointer
                        transition-all duration-200
                        ${isSelected
                          ? 'shadow-[0_0_0_2px] scale-[1.02]'
                          : 'bg-surface border border-transparent hover:border-separator-light hover:bg-surface-raised'
                        }
                      `}
                      style={isSelected ? {
                        backgroundColor: accent.bg,
                        boxShadow: `0 0 0 2px ${accent.color}`,
                      } : undefined}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={isSelected
                          ? { backgroundColor: accent.color, color: '#fff' }
                          : { backgroundColor: '#F2F2F7', color: '#6E6E73' }
                        }
                      >
                        <SpecialtyIcon specialty={opt.value} className="w-5 h-5" />
                      </div>
                      <span className={`
                        text-[13px] font-medium leading-tight transition-colors duration-200
                        ${isSelected ? 'text-text-primary' : 'text-text-secondary'}
                      `}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5">
                          <svg className="w-4 h-4" style={{ color: accent.color }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Custom specialty input */}
              {specialty === 'Other' && (
                <input
                  type="text"
                  value={customSpecialty}
                  onChange={(e) => setCustomSpecialty(e.target.value)}
                  placeholder="e.g., Neurologist, Urologist..."
                  className="w-full mt-3 px-3.5 py-3 bg-surface border-[1.5px] border-separator rounded-xl text-[15px] text-text-primary placeholder-text-tertiary outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
                  autoFocus
                />
              )}
            </div>

            {/* Step 2 — Language */}
            <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Document Language</h2>
                  <p className="text-xs text-text-tertiary mt-0.5">Medical content will be in the selected language. Drug names stay international.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((opt) => {
                  const isSelected = language === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLanguage(opt.value)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                        transition-all duration-200 cursor-pointer
                        ${isSelected
                          ? 'bg-purple-500 text-white shadow-[0_2px_8px_rgba(139,92,246,0.3)]'
                          : 'bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-raised border border-transparent hover:border-separator-light'
                        }
                      `}
                    >
                      {opt.flag && (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-white/70' : 'text-text-tertiary'}`}>
                          {opt.flag}
                        </span>
                      )}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {language === 'Other' && (
                <input
                  type="text"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder="e.g., Dutch, Hindi, Hebrew..."
                  className="w-full mt-3 px-3.5 py-3 bg-surface border-[1.5px] border-separator rounded-xl text-[15px] text-text-primary placeholder-text-tertiary outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition"
                  autoFocus
                />
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(52,120,246,0.25)] hover:shadow-[0_6px_28px_rgba(52,120,246,0.35)] active:scale-[0.98] animate-fade-in-up"
              style={{ animationDelay: '180ms' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Generate Document
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Document View ──────────────────────────────────────────────

  if (view === 'view' && !prepData) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
        <div className="bg-[#FFEDEC] border border-[#FF3B30]/20 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#C41E16]">Failed to load document</p>
            <button
              onClick={goToDashboard}
              className="mt-2 text-sm font-medium text-[#FF3B30] hover:underline cursor-pointer"
            >
              Back to documents
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'view' && prepData) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Sticky header bar */}
        <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-lg border-b border-separator-light px-4 sm:px-6 py-3 no-print">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToDashboard}
              className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              All Documents
            </button>
            <DoctorPrepPDFButton data={prepData} />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6">
          <DoctorPrepView data={prepData} />
        </div>
      </div>
    )
  }

  // Fallback — go to dashboard
  return null
}
