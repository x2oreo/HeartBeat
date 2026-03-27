'use client'

import type { EnhancedEmergencyCardData } from '@/types'

type Props = {
  data: EnhancedEmergencyCardData
  isPublic?: boolean
}

function getRiskColor(riskCategory: string) {
  switch (riskCategory) {
    case 'KNOWN_RISK':
      return 'bg-[#FFEDEC] text-[#C41E16]'
    case 'POSSIBLE_RISK':
      return 'bg-[#FFF5E0] text-[#8A5600]'
    case 'CONDITIONAL_RISK':
      return 'bg-[#FFF5E0] text-[#8A5600]'
    default:
      return 'bg-[#EAFBF0] text-[#1B7A34]'
  }
}

export function EmergencyCardView({ data, isPublic = false }: Props) {
  const aiContent = data.aiContent

  if (!aiContent) return null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-coral-deep rounded-t-2xl px-6 py-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{aiContent.headline}</h1>
            <p className="text-white/80 text-sm">HeartGuard Emergency Card</p>
          </div>
        </div>
      </div>

      {/* Patient Info Bar */}
      <div className="bg-coral px-6 py-3 flex flex-wrap items-center gap-3 text-white text-sm">
        <span className="font-semibold">{data.patientName}</span>
        <span className="w-px h-4 bg-white/30" />
        <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-medium">
          LQTS {data.genotype ?? 'Unknown'}
        </span>
        {!isPublic && data.generatedAt && (
          <>
            <span className="w-px h-4 bg-white/30" />
            <span className="text-white/60 text-xs">
              Generated {new Date(data.generatedAt).toLocaleDateString()}
            </span>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className="bg-surface-raised border border-t-0 border-separator-light rounded-b-2xl overflow-hidden">
        {/* Critical Warning */}
        <div className="mx-4 mt-4 p-4 bg-[#FFEDEC] border border-[#FF3B30]/20 rounded-xl">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-semibold text-[#C41E16]">
              {aiContent.criticalWarning}
            </p>
          </div>
        </div>

        {/* Drugs to Avoid */}
        {aiContent.drugsToAvoidByCategory.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              Drugs to Avoid
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

        {/* Safe ER Medications */}
        {aiContent.safeERMedications.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              Safe ER Medications
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

        {/* Emergency Protocol */}
        {aiContent.emergencyProtocolSteps.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand" />
              Emergency Protocol
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
        {data.medications.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Current Medications
            </h2>
            <div className="space-y-2">
              {data.medications.map((med, i) => {
                const aiNote = aiContent.currentMedicationNotes.find(
                  (n) => n.name.toLowerCase() === med.name.toLowerCase(),
                )
                return (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getRiskColor(med.riskCategory)}`}>
                      {med.name}
                    </span>
                    {med.isDTA && (
                      <span className="text-xs bg-[#FF3B30] text-white px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                        DTA
                      </span>
                    )}
                    {aiNote && (
                      <span className="text-text-tertiary text-xs pt-0.5">
                        {aiNote.warning}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        {data.emergencyContacts.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-text-tertiary" />
              Emergency Contacts
            </h2>
            <div className="space-y-2">
              {data.emergencyContacts.map((contact, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-surface rounded-xl px-3 py-2">
                  <div>
                    <span className="font-medium text-text-primary">
                      {contact.name}
                    </span>
                    <span className="text-text-tertiary ml-2 text-xs capitalize">
                      {contact.relationship}
                    </span>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-brand font-medium hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mx-4 mt-5 mb-4 p-3 bg-surface rounded-xl">
          <p className="text-xs text-text-tertiary text-center">
            AI-generated reference only. Always consult the patient&apos;s cardiologist before administering medications.
            Generated by HeartGuard on {new Date(data.generatedAt).toLocaleDateString()}.
          </p>
        </div>
      </div>
    </div>
  )
}
