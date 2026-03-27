'use client'

import { riskColor, riskDotColor, riskLabel } from '@/lib/risk-utils'
import type { RiskCategory } from '@/types'

type MedicationListResult = {
  medications: {
    id: string
    genericName: string
    brandName: string | null
    dosage: string | null
    qtRisk: string
    isDTA: boolean
  }[]
  count: number
}

function isMedicationList(data: unknown): data is MedicationListResult {
  return typeof data === 'object' && data !== null && 'medications' in data && 'count' in data
}

export function MedicationListPart({ result }: { result: unknown }) {
  if (!isMedicationList(result)) return null

  if (result.count === 0) {
    return (
      <div className="rounded-2xl bg-surface-raised p-4 card-shadow">
        <p className="text-sm text-text-secondary">You don&apos;t have any medications saved yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-raised p-4 card-shadow">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider">Your Medications</h3>
        <span className="text-[10px] font-bold text-text-tertiary bg-surface px-1.5 py-0.5 rounded-md">{result.count}</span>
      </div>
      <div className="space-y-2">
        {result.medications.map((med) => {
          const colors = riskColor(med.qtRisk as RiskCategory, med.isDTA)
          return (
            <div key={med.id} className="flex items-center gap-2.5">
              <div className={`h-2.5 w-2.5 rounded-full ${riskDotColor(med.qtRisk as RiskCategory, med.isDTA)}`} />
              <span className="text-sm font-medium text-text-primary flex-1">{med.genericName}</span>
              {med.dosage && (
                <span className="text-[11px] text-text-tertiary">{med.dosage}</span>
              )}
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                {riskLabel(med.qtRisk as RiskCategory)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
