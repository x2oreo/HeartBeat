'use client'

import { useState } from 'react'
import { EmergencyCardPDFButton } from '@/components/documents/PDFGenerator'
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

function getRiskColor(riskCategory: string) {
  switch (riskCategory) {
    case 'KNOWN_RISK':
      return { bg: 'bg-[#FFEDEC]', text: 'text-[#C41E16]', dot: 'bg-[#FF3B30]' }
    case 'POSSIBLE_RISK':
      return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', dot: 'bg-[#FF9F0A]' }
    case 'CONDITIONAL_RISK':
      return { bg: 'bg-[#FFF5E0]', text: 'text-[#8A5600]', dot: 'bg-[#FF9F0A]' }
    default:
      return { bg: 'bg-[#EAFBF0]', text: 'text-[#1B7A34]', dot: 'bg-[#34C759]' }
  }
}

export function PublicCardClient({ data }: Props) {
  const [lang, setLang] = useState<Lang>('en')
  const t = translations[lang]
  const { aiContent } = data
  const genotype = data.genotype ?? 'UNKNOWN'
  const typeContent = t.lqtsTypes[genotype] ?? null

  return (
    <div className="space-y-5">
      {/* Language Toggle */}
      <div className="max-w-lg mx-auto flex justify-end">
        <div className="inline-flex rounded-lg border border-separator-light overflow-hidden bg-surface-raised">
          <button
            onClick={() => setLang('en')}
            className={`px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              lang === 'en'
                ? 'bg-brand text-white'
                : 'text-text-secondary hover:bg-surface'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('bg')}
            className={`px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              lang === 'bg'
                ? 'bg-brand text-white'
                : 'text-text-secondary hover:bg-surface'
            }`}
          >
            BG
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto space-y-4">
        {/* Patient Header Card */}
        <div className="bg-surface-raised rounded-2xl card-shadow overflow-hidden">
          <div className="bg-coral-deep px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">{t.emergencyMedicalCard}</h1>
                <p className="text-white/70 text-xs">{t.poweredBy}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-4">
              {data.patientPhoto ? (
                <img
                  src={data.patientPhoto}
                  alt={data.patientName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-separator-light flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-coral-light flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-coral-deep">
                    {data.patientName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-text-primary">{data.patientName}</p>
                <span className="inline-block mt-1 bg-coral-light text-coral-deep text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  LQTS {genotype !== 'UNKNOWN' ? genotype : t.typeUnknown.split('.')[0]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Warning */}
        <div className="bg-[#FFEDEC] border border-[#FF3B30]/20 rounded-2xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-[11px] font-bold text-[#C41E16] uppercase tracking-wider mb-1">
                {t.sections.criticalWarning}
              </p>
              <p className="text-sm font-semibold text-[#C41E16]">
                {aiContent.criticalWarning}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Notes */}
        {data.personalNotes && data.personalNotes[lang] && (
          <div className="bg-surface-raised rounded-2xl card-shadow p-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand" />
              {t.sections.personalNotes}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {data.personalNotes[lang]}
            </p>
          </div>
        )}

        {/* LQTS Disease Overview */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5">
          <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            {t.lqtsOverview.title}
          </h2>
          <div className="space-y-3">
            {t.lqtsOverview.paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-text-secondary leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* LQTS Type-Specific Section */}
        {typeContent && (
          <div className="bg-surface-raised rounded-2xl card-shadow overflow-hidden">
            <div className="bg-brand-light px-5 py-3">
              <h2 className="text-[11px] font-bold text-brand-deep uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand" />
                {t.sections.myType}: {genotype}
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-base font-semibold text-text-primary mb-1">{typeContent.name}</p>
                <p className="text-xs text-text-tertiary">{typeContent.channelAffected}</p>
              </div>

              {/* Triggers */}
              <div>
                <p className="text-xs font-semibold text-[#C41E16] uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Triggers' : 'Тригери'}
                </p>
                <ul className="space-y-1.5">
                  {typeContent.triggers.map((trigger, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] mt-1.5 flex-shrink-0" />
                      {trigger}
                    </li>
                  ))}
                </ul>
              </div>

              {/* ECG Pattern */}
              <div className="bg-surface rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                  {lang === 'en' ? 'ECG Pattern' : 'ЕКГ модел'}
                </p>
                <p className="text-sm text-text-primary">{typeContent.ecgPattern}</p>
              </div>

              {/* Treatment */}
              <div className="bg-[#EAFBF0] rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-[#1B7A34] uppercase tracking-wider mb-1">
                  {lang === 'en' ? 'Treatment' : 'Лечение'}
                </p>
                <p className="text-sm text-[#1B7A34]">{typeContent.treatment}</p>
              </div>
            </div>
          </div>
        )}

        {/* Guidance: What to Do / What NOT to Do */}
        {typeContent && (
          <div className="grid grid-cols-1 gap-4">
            {/* What to Do */}
            <div className="bg-surface-raised rounded-2xl card-shadow p-5">
              <h2 className="text-[11px] font-bold text-[#1B7A34] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                {t.sections.whatToDo}
              </h2>
              <ul className="space-y-2">
                {typeContent.guidance.do.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-[#34C759] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* What NOT to Do */}
            <div className="bg-surface-raised rounded-2xl card-shadow p-5">
              <h2 className="text-[11px] font-bold text-[#C41E16] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                {t.sections.whatNotToDo}
              </h2>
              <ul className="space-y-2">
                {typeContent.guidance.dont.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-[#FF3B30] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Restrictions */}
        {typeContent && typeContent.restrictions.length > 0 && (
          <div className="bg-[#FFEDEC] rounded-2xl p-5">
            <h2 className="text-[11px] font-bold text-[#C41E16] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              {t.sections.restrictions}
            </h2>
            <ul className="space-y-2">
              {typeContent.restrictions.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[#C41E16]">
                  <svg className="w-4 h-4 text-[#FF3B30] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* General Precautions (for OTHER/UNKNOWN or in addition) */}
        {(!typeContent || genotype === 'OTHER' || genotype === 'UNKNOWN') && (
          <div className="bg-[#FFF5E0] rounded-2xl p-5">
            <h2 className="text-[11px] font-bold text-[#8A5600] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
              {t.generalPrecautions.title}
            </h2>
            <ul className="space-y-2">
              {t.generalPrecautions.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[#8A5600]">
                  <svg className="w-4 h-4 text-[#FF9F0A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Drugs to Avoid (from AI) */}
        {aiContent.drugsToAvoidByCategory.length > 0 && (
          <div className="bg-surface-raised rounded-2xl card-shadow p-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              {t.sections.drugsToAvoid}
            </h2>
            <div className="space-y-3">
              {aiContent.drugsToAvoidByCategory.map((cat) => (
                <div key={cat.category} className="bg-surface rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.drugs.map((drug) => (
                      <span
                        key={drug}
                        className="inline-block bg-[#FFEDEC] text-[#C41E16] text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        {drug}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safe ER Medications (from AI) */}
        {aiContent.safeERMedications.length > 0 && (
          <div className="bg-surface-raised rounded-2xl card-shadow p-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              {t.sections.safeERMedications}
            </h2>
            <div className="bg-[#EAFBF0] border border-[#34C759]/20 rounded-xl p-3 space-y-2">
              {aiContent.safeERMedications.map((med) => (
                <div key={med.name} className="flex gap-2 text-sm">
                  <span className="font-semibold text-[#1B7A34] whitespace-nowrap">
                    {med.name}
                  </span>
                  <span className="text-[#1B7A34]/80">— {med.notes}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Protocol (from AI) */}
        {aiContent.emergencyProtocolSteps.length > 0 && (
          <div className="bg-surface-raised rounded-2xl card-shadow p-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand" />
              {t.sections.emergencyProtocol}
            </h2>
            <ol className="space-y-2">
              {aiContent.emergencyProtocolSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-brand-light text-brand-deep flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-text-secondary pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Current Medications */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5">
          <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            {t.sections.currentMedications}
          </h2>
          {data.medications.length > 0 ? (
            <div className="space-y-2.5">
              {data.medications.map((med, i) => {
                const risk = getRiskColor(med.riskCategory)
                const aiNote = aiContent.currentMedicationNotes.find(
                  (n) => n.name.toLowerCase() === med.name.toLowerCase(),
                )
                return (
                  <div key={i} className={`${risk.bg} rounded-xl px-4 py-3`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full ${risk.dot} flex-shrink-0`} />
                      <span className={`text-sm font-semibold ${risk.text}`}>
                        {med.name}
                      </span>
                      {med.brandName && (
                        <span className="text-xs text-text-tertiary">
                          ({med.brandName})
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${risk.text} ml-auto`}>
                        {getRiskLabel(med.riskCategory, lang)}
                      </span>
                    </div>
                    {med.dosage && (
                      <p className="text-xs text-text-tertiary mt-1">
                        {t.medicationLabels.dose}: {med.dosage}
                      </p>
                    )}
                    {med.isDTA && (
                      <span className="inline-block mt-1 text-xs bg-[#FF3B30] text-white px-1.5 py-0.5 rounded font-medium">
                        {t.medicationLabels.dtaWarning}
                      </span>
                    )}
                    {aiNote && (
                      <p className="text-xs text-text-secondary mt-1.5">{aiNote.warning}</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">{t.noMedications}</p>
          )}
        </div>

        {/* Emergency Contacts */}
        <div className="bg-surface-raised rounded-2xl card-shadow p-5">
          <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-text-tertiary" />
            {t.sections.emergencyContacts}
          </h2>
          {data.emergencyContacts.length > 0 ? (
            <div className="space-y-2">
              {data.emergencyContacts.map((contact, i) => (
                <div key={i} className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{contact.name}</p>
                    <p className="text-xs text-text-tertiary capitalize">
                      {getRelationshipLabel(contact.relationship, lang)}
                    </p>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {t.contactLabels.call}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">{t.noContacts}</p>
          )}
        </div>

        {/* PDF Download */}
        <div className="flex justify-center">
          <EmergencyCardPDFButton data={data} />
        </div>

        {/* Disclaimer */}
        <div className="bg-surface rounded-2xl p-4">
          <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">
            {t.sections.disclaimer}
          </p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            {t.disclaimerText}
          </p>
          <p className="text-xs text-text-tertiary mt-2">
            {t.generatedBy} — {new Date(data.generatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
