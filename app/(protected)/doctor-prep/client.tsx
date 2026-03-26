'use client'

import { useState } from 'react'
import { useDoctorPrep } from '@/hooks/use-documents'
import { DoctorPrepView } from '@/components/documents/DoctorPrepView'
import { DoctorPrepPDFButton } from '@/components/documents/PDFGenerator'

const PROCEDURE_OPTIONS = [
  { value: '', label: 'No specific procedure' },
  { value: 'Dental Procedure', label: 'Dental Procedure' },
  { value: 'Surgery — General Anesthesia', label: 'Surgery — General Anesthesia' },
  { value: 'Surgery — Local Anesthesia', label: 'Surgery — Local Anesthesia' },
  { value: 'Endoscopy', label: 'Endoscopy' },
  { value: 'MRI with Contrast', label: 'MRI with Contrast' },
  { value: 'General Checkup', label: 'General Checkup' },
  { value: 'other', label: 'Other (specify)' },
]

export function DoctorPrepClient() {
  const { prepData, isGenerating, error, generate } = useDoctorPrep()
  const [selectedProcedure, setSelectedProcedure] = useState('')
  const [customProcedure, setCustomProcedure] = useState('')

  function handleGenerate() {
    let procedureType: string | null = null
    if (selectedProcedure === 'other' && customProcedure.trim()) {
      procedureType = customProcedure.trim()
    } else if (selectedProcedure && selectedProcedure !== 'other') {
      procedureType = selectedProcedure
    }
    generate(procedureType)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Doctor Visit Prep</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Generate a medication safety brief to share with your doctor before a visit or procedure.
        </p>
      </div>

      {/* Form */}
      {!prepData && !isGenerating && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="procedure" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Procedure Type (optional)
              </label>
              <select
                id="procedure"
                value={selectedProcedure}
                onChange={(e) => setSelectedProcedure(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              >
                {PROCEDURE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedProcedure === 'other' && (
              <div>
                <label htmlFor="customProcedure" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Describe the procedure
                </label>
                <input
                  id="customProcedure"
                  type="text"
                  value={customProcedure}
                  onChange={(e) => setCustomProcedure(e.target.value)}
                  placeholder="e.g., Colonoscopy, Cardiac catheterization..."
                  className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                />
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand hover:bg-brand-deep text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Doctor Prep Sheet
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-brand-light dark:bg-brand-dark/40 rounded-t-2xl h-20" />
            <div className="bg-brand/30 dark:bg-brand-dark/60 h-10" />
            <div className="bg-white dark:bg-neutral-900 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-2xl p-6 space-y-4">
              <div className="h-20 bg-brand-pale dark:bg-brand-dark/20 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
                <div className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4 animate-pulse">
            Generating your doctor prep sheet...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {prepData && !isGenerating && (
        <>
          <DoctorPrepView data={prepData} />

          {/* Action Bar */}
          <div className="max-w-2xl mx-auto flex flex-wrap gap-3">
            <DoctorPrepPDFButton data={prepData} />

            <button
              onClick={() => {
                setSelectedProcedure('')
                setCustomProcedure('')
                generate(null)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  )
}
