'use client'

import { useState } from 'react'
import type { EnhancedEmergencyCardData } from '@/types'
import {
  translations,
  getRiskLabel,
  getRelationshipLabel,
  type Lang,
} from '@/lib/translations/emergency-card'

type Props = {
  data: EnhancedEmergencyCardData
}

function getRiskStyle(risk: string) {
  switch (risk) {
    case 'KNOWN_RISK': return { bg: 'bg-[#FFEDEC]', text: 'text-[#C41E16]', dot: '#FF3B30', border: 'border-[#FF3B30]/20' }
    case 'POSSIBLE_RISK': return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', dot: '#FF9F0A', border: 'border-[#FF9F0A]/20' }
    case 'CONDITIONAL_RISK': return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', dot: '#FF9F0A', border: 'border-[#FF9F0A]/20' }
    default: return { bg: 'bg-[#EAFBF0]', text: 'text-[#1B7A34]', dot: '#34C759', border: 'border-[#34C759]/20' }
  }
}

export function PublicCardClient({ data }: Props) {
  const [lang, setLang] = useState<Lang>('en')
  const [copied, setCopied] = useState(false)
  const t = translations[lang]
  const genotype = data.genotype ?? 'UNKNOWN'
  const typeContent = t.lqtsTypes[genotype] ?? null

  const hasHighRiskMeds = data.medications.some(
    (m) => m.riskCategory === 'KNOWN_RISK' || m.isDTA,
  )

  // Separate cardiologist contacts from others for priority display
  const cardiologistContacts = data.emergencyContacts.filter(
    (c) => c.relationship === 'cardiologist',
  )
  const otherContacts = data.emergencyContacts.filter(
    (c) => c.relationship !== 'cardiologist',
  )

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Language Toggle + Copy Link */}
      <div className="flex items-center justify-between px-1">
        <div className="inline-flex rounded-full overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}>
          <button
            onClick={() => setLang('en')}
            className={`px-4 py-1.5 text-[13px] font-semibold transition-all cursor-pointer ${
              lang === 'en'
                ? 'bg-text-primary text-white'
                : 'bg-surface-raised text-text-secondary hover:bg-surface'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('bg')}
            className={`px-4 py-1.5 text-[13px] font-semibold transition-all cursor-pointer ${
              lang === 'bg'
                ? 'bg-text-primary text-white'
                : 'bg-surface-raised text-text-secondary hover:bg-surface'
            }`}
          >
            BG
          </button>
        </div>

        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-raised hover:bg-surface text-text-secondary text-[13px] font-semibold rounded-full transition-colors cursor-pointer"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-[#34C759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {lang === 'en' ? 'Copied!' : 'Копирано!'}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {lang === 'en' ? 'Copy Link' : 'Копирай линк'}
            </>
          )}
        </button>
      </div>

      {/* ===== 1. PATIENT HEADER ===== */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="p-5">
          <div className="flex items-center gap-4">
            {data.patientPhoto ? (
              <img
                src={data.patientPhoto}
                alt=""
                className="w-[72px] h-[72px] rounded-full object-cover flex-shrink-0"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-b from-[#E8E8ED] to-[#D1D1D6] flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">
                  {data.patientName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-[20px] font-bold text-text-primary tracking-tight">{data.patientName}</p>
              {genotype !== 'UNKNOWN' && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 bg-coral-light text-coral-deep text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  LQTS {genotype}
                </span>
              )}
              {/* Last updated timestamp */}
              {data.generatedAt && (
                <p className="text-[11px] text-text-tertiary mt-1.5">
                  {lang === 'en' ? 'Updated' : 'Обновено'}: {new Date(data.generatedAt).toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 2. EMERGENCY CONTACTS (moved up — first thing ER staff needs) ===== */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">
            {t.sections.emergencyContacts}
          </h2>
        </div>

        {data.emergencyContacts.length > 0 ? (
          <div>
            {/* Cardiologist contacts first — with distinct blue medical styling */}
            {cardiologistContacts.map((contact, i) => (
              <div key={`card-${i}`}>
                {i > 0 && <div className="h-px bg-separator-light ml-5" />}
                <div className="flex items-center justify-between px-5 py-3 bg-[#F0F7FF]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#3478F6] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-text-primary">{contact.name}</p>
                      <p className="text-[12px] font-medium text-[#3478F6] uppercase tracking-wide">
                        {getRelationshipLabel(contact.relationship, lang)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#3478F6] text-white text-[13px] font-semibold rounded-full hover:bg-[#2860D0] transition-colors min-h-[44px]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {t.contactLabels.call}
                  </a>
                </div>
              </div>
            ))}

            {/* Divider between cardiologist and other contacts */}
            {cardiologistContacts.length > 0 && otherContacts.length > 0 && (
              <div className="h-px bg-separator-light" />
            )}

            {/* Other contacts */}
            {otherContacts.map((contact, i) => (
              <div key={`other-${i}`}>
                {i > 0 && <div className="h-px bg-separator-light ml-5" />}
                <div className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-[15px] font-medium text-text-primary">{contact.name}</p>
                    <p className="text-[13px] text-text-tertiary capitalize">
                      {getRelationshipLabel(contact.relationship, lang)}
                    </p>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#34C759] text-white text-[13px] font-semibold rounded-full hover:bg-[#2DA44E] transition-colors min-h-[44px]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {t.contactLabels.call}
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 pb-4">
            <p className="text-[15px] text-text-tertiary">{t.noContacts}</p>
          </div>
        )}
      </div>

      {/* ===== 3. CURRENT MEDICATIONS (moved up — critical before prescribing) ===== */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">
            {t.sections.currentMedications}
          </h2>
        </div>

        {/* High-risk medication alert banner */}
        {hasHighRiskMeds && (
          <div className="mx-4 mb-2 px-3.5 py-2.5 bg-[#FEF2F2] border border-[#FF3B30]/15 rounded-xl">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-[12px] font-semibold text-[#991B1B] leading-snug">
                {lang === 'en'
                  ? 'This patient takes QT-prolonging medications. Check drug interactions before prescribing.'
                  : 'Този пациент приема медикаменти, удължаващи QT интервала. Проверете лекарствените взаимодействия преди предписване.'}
              </p>
            </div>
          </div>
        )}

        {data.medications.length > 0 ? (
          <div>
            {data.medications.map((med, i) => {
              const risk = getRiskStyle(med.riskCategory)
              return (
                <div key={i}>
                  {i > 0 && <div className="h-px bg-separator-light ml-5" />}
                  <div className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-semibold text-text-primary">{med.name}</p>
                        {med.brandName && (
                          <p className="text-[13px] text-text-tertiary">{med.brandName}</p>
                        )}
                        {med.dosage && (
                          <p className="text-[13px] text-text-tertiary">{med.dosage}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {med.isDTA && (
                          <span
                            className="text-[10px] font-bold bg-[#FF3B30] text-white px-1.5 py-0.5 rounded"
                            title={lang === 'en' ? 'Torsades de Pointes risk — can cause fatal arrhythmia' : 'Риск от Torsades de Pointes — може да причини фатална аритмия'}
                          >
                            DTA
                          </span>
                        )}
                        <span className={`${risk.bg} ${risk.text} text-[11px] font-semibold px-2 py-0.5 rounded-full`}>
                          {getRiskLabel(med.riskCategory, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 pb-4">
            <p className="text-[15px] text-text-tertiary">{t.noMedications}</p>
          </div>
        )}
      </div>

      {/* ===== 4. PERSONAL NOTES (moved up — allergies, conditions for treatment) ===== */}
      {data.personalNotes && data.personalNotes[lang] && (
        <div className="bg-surface-raised rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
            {t.sections.personalNotes}
          </h2>
          <p className="text-[15px] text-text-primary leading-relaxed">
            {data.personalNotes[lang]}
          </p>
        </div>
      )}

      {/* ===== 5. EMERGENCY PROTOCOL — What medics should do when unresponsive ===== */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #DC2626' }}>
        {/* Red alert banner */}
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

        {/* Immediate steps */}
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

        {/* DO NOT section */}
        <div className="bg-[#FEF2F2] px-5 py-4" style={{ borderTop: '1px solid #FECACA' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h3 className="text-[14px] font-extrabold text-[#DC2626] uppercase tracking-wide">
              {lang === 'en' ? 'DO NOT ADMINISTER' : 'НЕ ПРИЛАГАЙТЕ'}
            </h3>
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

        {/* Torsades de Pointes protocol */}
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

        {/* Genotype-specific emergency notes */}
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

      {/* ===== 6. LQTS OVERVIEW — Educational content (lower priority) ===== */}
      <div className="bg-surface-raised rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h2 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-3">
          {t.lqtsOverview.title}
        </h2>
        <div className="space-y-3">
          {t.lqtsOverview.paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] text-text-secondary leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* ===== 7. TYPE-SPECIFIC INFO — Reference material ===== */}
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

            {/* Triggers */}
            <div>
              <p className="text-[13px] font-semibold text-[#C41E16] uppercase tracking-wide mb-2">
                {lang === 'en' ? 'Triggers' : 'Тригери'}
              </p>
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

            {/* ECG */}
            <div>
              <p className="text-[13px] font-semibold text-text-tertiary uppercase tracking-wide mb-1">
                {lang === 'en' ? 'ECG Pattern' : 'ЕКГ модел'}
              </p>
              <p className="text-[15px] text-text-primary">{typeContent.ecgPattern}</p>
            </div>

            <div className="h-px bg-separator-light" />

            {/* Treatment */}
            <div>
              <p className="text-[13px] font-semibold text-[#1B7A34] uppercase tracking-wide mb-1">
                {lang === 'en' ? 'Treatment' : 'Лечение'}
              </p>
              <p className="text-[15px] text-text-primary">{typeContent.treatment}</p>
            </div>
          </div>
        </div>
      )}

      {/* General Precautions (for OTHER/UNKNOWN when no type-specific info) */}
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

      {/* ===== PATIENT GUIDANCE — What to do / not do day-to-day ===== */}
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

      {/* Disclaimer */}
      <div className="px-1 py-4">
        <p className="text-[13px] text-text-tertiary leading-relaxed text-center">
          {t.disclaimerText}
        </p>
        <p className="text-[11px] text-text-quaternary text-center mt-2">
          {t.generatedBy}
        </p>
      </div>
    </div>
  )
}
