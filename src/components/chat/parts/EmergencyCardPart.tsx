'use client'

import Link from 'next/link'
import type { EnhancedEmergencyCardData } from '@/types'

function isEmergencyCard(data: unknown): data is EnhancedEmergencyCardData {
  return typeof data === 'object' && data !== null && 'patientName' in data && 'emergencyContacts' in data
}

export function EmergencyCardPart({ result }: { result: unknown }) {
  if (!isEmergencyCard(result)) return null

  return (
    <div className="rounded-2xl bg-surface-raised overflow-hidden card-shadow">
      <div className="bg-[#F07167] px-4 py-3 flex items-center gap-2.5">
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span className="text-sm font-semibold text-white">Emergency Card Ready</span>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm text-text-primary font-medium">{result.patientName}</p>
        <p className="text-[13px] text-text-secondary">
          {result.genotype ? `LQTS ${result.genotype}` : 'LQTS'}
          {' \u00B7 '}
          {result.medications.length} medication{result.medications.length !== 1 ? 's' : ''}
          {' \u00B7 '}
          {result.emergencyContacts.length} emergency contact{result.emergencyContacts.length !== 1 ? 's' : ''}
        </p>
        {result.aiContent?.headline && (
          <p className="text-[12px] text-text-tertiary mt-1">{result.aiContent.headline}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Link
            href="/emergency-card"
            className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold text-center transition-colors hover:bg-brand-hover"
          >
            View Full Card
          </Link>
          {result.shareSlug && (
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/emergency-card/${result.shareSlug}`
                navigator.clipboard.writeText(url).catch(() => {})
              }}
              className="py-2.5 px-4 rounded-xl border-[1.5px] border-separator text-text-secondary text-sm font-medium transition-colors hover:bg-surface hover:border-brand hover:text-brand"
            >
              Copy Link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
