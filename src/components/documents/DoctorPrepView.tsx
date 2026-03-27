'use client'

import { useState } from 'react'
import type { DoctorPrepData } from '@/types'
import { groupDrugsByClass } from '@/lib/drug-utils'

type Props = {
  data: DoctorPrepData
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  KNOWN_RISK: { bg: 'bg-[#FFEDEC]', text: 'text-[#C41E16]', border: 'border-[#FF3B30]/20', label: 'Known Risk' },
  POSSIBLE_RISK: { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', border: 'border-[#FF9F0A]/20', label: 'Possible Risk' },
  CONDITIONAL_RISK: { bg: 'bg-[#FFF9E6]', text: 'text-[#7A6200]', border: 'border-[#FF9F0A]/15', label: 'Conditional' },
  NOT_LISTED: { bg: 'bg-[#EAFBF0]', text: 'text-[#1B7A34]', border: 'border-[#34C759]/20', label: 'Not Listed' },
}

// Section wrapper with colored left accent
function Section({ accentColor, children, className = '' }: {
  accentColor: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-surface-raised rounded-xl card-shadow overflow-hidden ${className}`}
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, count }: {
  icon: React.ReactNode
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
      <span className="flex-shrink-0">{icon}</span>
      <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">{title}</h2>
      {count !== undefined && (
        <span className="text-[10px] font-bold text-text-tertiary bg-surface px-1.5 py-0.5 rounded-md">
          {count}
        </span>
      )}
    </div>
  )
}

export function DoctorPrepView({ data }: Props) {
  const [prohibitedOpen, setProhibitedOpen] = useState(false)

  const resolvedSpecialty = data.doctorSpecialty === 'Other' && data.customSpecialty
    ? data.customSpecialty
    : data.doctorSpecialty
  const resolvedLanguage = data.language === 'Other' && data.customLanguage
    ? data.customLanguage
    : data.language

  const prohibitedByClass = groupDrugsByClass(data.prohibitedDrugs)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ── Document Header ─────────────────────────────────────── */}
      <div className="bg-brand rounded-2xl overflow-hidden card-shadow animate-fade-in-up">
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Doctor Visit Preparation</h1>
              <p className="text-white/60 text-sm mt-0.5">HeartGuard Medical Brief</p>
            </div>
          </div>
        </div>

        {/* Patient info chips */}
        <div className="bg-brand-deep px-5 py-3 sm:px-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">{data.patientName}</span>
          <span className="w-px h-4 bg-white/20" />
          <span className="bg-white/15 px-2.5 py-0.5 rounded-md text-xs font-medium text-white/90">
            LQTS {data.genotype ?? 'Unknown'}
          </span>
          <span className="w-px h-4 bg-white/20" />
          <span className="bg-white/15 px-2.5 py-0.5 rounded-md text-xs font-medium text-white/90">
            {resolvedSpecialty}
          </span>
          <span className="w-px h-4 bg-white/20" />
          <span className="bg-white/10 px-2.5 py-0.5 rounded-md text-xs font-medium text-white/70">
            {resolvedLanguage}
          </span>
        </div>
      </div>

      {/* ── Syndrome Explanation ─────────────────────────────────── */}
      {data.syndromeExplanation && (
        <Section accentColor="#3478F6" className="animate-fade-in-up" >
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            }
            title="About This Patient's Condition"
          />
          <div className="px-4 pb-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              {data.syndromeExplanation}
            </p>
          </div>
        </Section>
      )}

      {/* ── Drug Safety Brief ───────────────────────────────────── */}
      <Section accentColor="#1A56C4" className="animate-fade-in-up">
        <SectionHeader
          icon={
            <svg className="w-4 h-4 text-brand-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          }
          title="Drug Safety Brief"
        />
        <div className="px-4 pb-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            {data.drugSafetyBrief}
          </p>
        </div>
      </Section>

      {/* ── Current Medications ──────────────────────────────────── */}
      {data.currentMedications.length > 0 && (
        <Section accentColor="#3478F6" className="animate-fade-in-up">
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l.8 3.45c.2.866-.531 1.75-1.414 1.75H4.814c-.883 0-1.614-.884-1.414-1.75l.8-3.45" />
              </svg>
            }
            title="Current Medications"
            count={data.currentMedications.length}
          />
          <div className="px-4 pb-4 space-y-2">
            {data.currentMedications.map((med, i) => {
              const risk = RISK_COLORS[med.riskCategory] ?? RISK_COLORS.NOT_LISTED
              const implication = data.medicationImplications.find(
                (m) => m.name.toLowerCase() === med.name.toLowerCase(),
              )
              return (
                <div key={i} className={`rounded-lg border ${risk.border} overflow-hidden`}>
                  <div className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-text-primary">{med.name}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${risk.bg} ${risk.text}`}>
                        {risk.label}
                      </span>
                      {med.isDTA && (
                        <span className="text-[10px] bg-[#FF3B30] text-white px-1.5 py-0.5 rounded-md font-bold tracking-wide">
                          DTA
                        </span>
                      )}
                    </div>
                    {implication && (
                      <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                        {implication.implication}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Medications to Avoid ─────────────────────────────────── */}
      {data.medicationsToAvoid.length > 0 && (
        <Section accentColor="#FF3B30" className="animate-fade-in-up">
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-[#FF3B30]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            }
            title="Medications to Avoid"
            count={data.medicationsToAvoid.length}
          />
          <div className="px-4 pb-4 space-y-2.5">
            {data.medicationsToAvoid.map((med) => (
              <div key={med.genericName} className="bg-[#FFEDEC]/50 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#C41E16]">{med.genericName}</span>
                  <span className="text-xs text-[#C41E16]/60 font-medium">({med.drugClass})</span>
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{med.reason}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Safer Alternatives ───────────────────────────────────── */}
      {data.saferAlternatives.length > 0 && (
        <Section accentColor="#34C759" className="animate-fade-in-up">
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Safer Alternatives"
            count={data.saferAlternatives.length}
          />
          <div className="px-4 pb-4 space-y-2">
            {data.saferAlternatives.map((alt) => (
              <div key={alt.genericName} className="bg-[#EAFBF0]/50 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[#1B7A34]">{alt.genericName}</span>
                  <span className="text-xs text-[#1B7A34]/60 font-medium">({alt.drugClass})</span>
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{alt.whySafer}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Specialty Warnings ───────────────────────────────────── */}
      {data.specialtyWarnings.length > 0 && (
        <Section accentColor="#FF9F0A" className="animate-fade-in-up">
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-[#FF9F0A]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            }
            title={`Warnings for ${resolvedSpecialty}`}
            count={data.specialtyWarnings.length}
          />
          <div className="px-4 pb-4 space-y-2">
            {data.specialtyWarnings.map((warning, i) => (
              <div key={i} className="flex gap-2.5 bg-[#FFF5E0]/60 rounded-lg px-3.5 py-2.5">
                <svg className="w-4 h-4 text-[#FF9F0A] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-[#8A5600] leading-relaxed">{warning}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Questions for Doctor ─────────────────────────────────── */}
      {data.questionsForDoctor.length > 0 && (
        <Section accentColor="#8B5CF6" className="animate-fade-in-up">
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            }
            title="Questions for Your Doctor"
            count={data.questionsForDoctor.length}
          />
          <div className="px-4 pb-4">
            <ol className="space-y-2">
              {data.questionsForDoctor.map((question, i) => (
                <li key={i} className="flex gap-3 group">
                  <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border border-purple-100">
                    {i + 1}
                  </span>
                  <span className="text-sm text-text-secondary leading-relaxed flex-1">{question}</span>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      )}

      {/* ── Prohibited Drugs (collapsible) ───────────────────────── */}
      {data.prohibitedDrugs.length > 0 && (
        <div className="bg-surface-raised rounded-xl card-shadow overflow-hidden animate-fade-in-up" style={{ borderLeft: '3px solid #FF3B30' }}>
          <button
            onClick={() => setProhibitedOpen(!prohibitedOpen)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer hover:bg-surface/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#FF3B30]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                All Prohibited Drugs
              </h2>
              <span className="text-[10px] font-bold text-[#C41E16] bg-[#FFEDEC] px-1.5 py-0.5 rounded-md">
                {data.prohibitedDrugs.length}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${prohibitedOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {prohibitedOpen && (
            <div className="px-4 pb-4 animate-expand">
              <div className="space-y-3 pt-1">
                {Array.from(prohibitedByClass.entries()).map(([drugClass, drugs]) => (
                  <div key={drugClass}>
                    <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                      {drugClass}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {drugs.map((d) => (
                        <span
                          key={d.genericName}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                            d.isDTA
                              ? 'bg-[#FFEDEC] text-[#C41E16] border border-[#FF3B30]/15'
                              : 'bg-surface text-text-secondary border border-separator-light'
                          }`}
                        >
                          {d.genericName}
                          {d.isDTA && (
                            <span className="ml-1 text-[10px] font-bold opacity-70">DTA</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-surface/80 p-4 animate-fade-in-up">
        <p className="text-xs text-text-tertiary text-center leading-relaxed">
          AI-generated reference only. This document does not replace professional medical advice.
          Always consult with your physician before making medication changes.
          Generated by HeartGuard on {new Date(data.generatedAt).toLocaleDateString()}.
        </p>
      </div>
    </div>
  )
}
