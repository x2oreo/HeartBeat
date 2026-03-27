'use client'

import Link from 'next/link'
import type { DoctorPrepData } from '@/types'

function isDoctorPrep(data: unknown): data is DoctorPrepData {
  return typeof data === 'object' && data !== null && 'doctorSpecialty' in data && 'summary' in data
}

export function DoctorPrepPart({ result }: { result: unknown }) {
  if (!isDoctorPrep(result)) return null

  return (
    <div className="rounded-2xl bg-surface-raised overflow-hidden card-shadow">
      <div className="bg-brand px-4 py-3 flex items-center gap-2.5">
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-semibold text-white">Doctor Prep Document</span>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm text-text-primary font-medium">{result.patientName}</p>
        <div className="flex gap-1.5">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-brand-light text-brand-deep">
            {result.customSpecialty ?? result.doctorSpecialty}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface text-text-secondary">
            {result.customLanguage ?? result.language}
          </span>
        </div>
        <p className="text-[12px] text-text-tertiary mt-1 line-clamp-2">{result.summary}</p>
        <div className="flex items-center gap-3 pt-1 text-[11px] text-text-tertiary">
          <span>{result.medicationsToAvoid.length} drugs to avoid</span>
          <span>{result.questionsForDoctor.length} questions for doctor</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Link
            href="/doctor-prep"
            className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold text-center transition-colors hover:bg-brand-hover"
          >
            View Document
          </Link>
        </div>
      </div>
    </div>
  )
}
