'use client'

import type { EnhancedDoctorPrepData } from '@/types'

type Props = {
  data: EnhancedDoctorPrepData
}

export function DoctorPrepView({ data }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-brand rounded-t-2xl px-6 py-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Doctor Visit Preparation</h1>
            <p className="text-white/80 text-sm">HeartGuard Medical Brief</p>
          </div>
        </div>
      </div>

      {/* Patient Info Bar */}
      <div className="bg-brand-deep px-6 py-3 flex flex-wrap items-center gap-3 text-white text-sm">
        <span className="font-semibold">{data.patientName}</span>
        <span className="w-px h-4 bg-white/30" />
        <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-medium">
          LQTS {data.genotype ?? 'Unknown'}
        </span>
        {data.procedureType && (
          <>
            <span className="w-px h-4 bg-white/30" />
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {data.procedureType}
            </span>
          </>
        )}
      </div>

      {/* Body */}
      <div className="bg-surface-raised border border-t-0 border-separator-light rounded-b-2xl overflow-hidden">
        {/* Drug Safety Brief */}
        <div className="mx-4 mt-4 p-4 bg-brand-light border border-brand/20 rounded-xl">
          <h2 className="text-sm font-bold text-brand-deep mb-2">Drug Safety Brief</h2>
          <p className="text-sm text-brand-deep/80 leading-relaxed">
            {data.drugSafetyBrief}
          </p>
        </div>

        {/* Medications to Avoid */}
        {data.medicationsToAvoid.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
              Medications to Avoid
            </h2>
            <ul className="space-y-1.5">
              {data.medicationsToAvoid.map((med) => (
                <li key={med} className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-[#FF3B30] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-secondary">{med}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Safer Alternatives */}
        {data.saferAlternatives.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              Safer Alternatives
            </h2>
            <div className="border border-separator-light rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface">
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Drug</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Class</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Why Safer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-separator-light">
                  {data.saferAlternatives.map((alt) => (
                    <tr key={alt.genericName}>
                      <td className="px-3 py-2 font-medium text-text-primary">{alt.genericName}</td>
                      <td className="px-3 py-2 text-text-secondary">{alt.drugClass}</td>
                      <td className="px-3 py-2 text-text-secondary">{alt.whySafer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Questions for Doctor */}
        {data.questionsForDoctor.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Questions for Your Doctor
            </h2>
            <ol className="space-y-2">
              {data.questionsForDoctor.map((question, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-5 h-5 rounded bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-text-secondary">{question}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Procedure-Specific Warnings */}
        {data.procedureSpecificWarnings.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
              Procedure-Specific Warnings
            </h2>
            <div className="bg-[#FFF5E0] border border-[#FF9F0A]/20 rounded-xl p-3 space-y-2">
              {data.procedureSpecificWarnings.map((warning, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <svg className="w-4 h-4 text-[#FF9F0A] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#8A5600]">{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {data.currentMedications.length > 0 && (
          <div className="px-4 pt-5">
            <h2 className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-text-tertiary" />
              Current Medications
            </h2>
            <div className="space-y-2">
              {data.currentMedications.map((med, i) => (
                <div key={i} className="text-sm bg-surface rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{med.name}</span>
                    <span className="text-xs text-text-tertiary">({med.riskCategory.replace('_', ' ')})</span>
                    {med.isDTA && (
                      <span className="text-xs bg-[#FF3B30] text-white px-1.5 py-0.5 rounded-full font-medium">DTA</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mx-4 mt-5 mb-4 p-3 bg-surface rounded-xl">
          <p className="text-xs text-text-tertiary text-center">
            AI-generated reference only. This document does not replace professional medical advice.
            Always consult with your physician before making medication changes.
            Generated by HeartGuard on {new Date(data.generatedAt).toLocaleDateString()}.
          </p>
        </div>
      </div>
    </div>
  )
}
