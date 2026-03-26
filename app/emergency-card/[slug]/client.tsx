'use client'

import { EmergencyCardView } from '@/components/documents/EmergencyCardView'
import { EmergencyCardPDFButton } from '@/components/documents/PDFGenerator'
import type { EnhancedEmergencyCardData } from '@/types'

type Props = {
  data: EnhancedEmergencyCardData
}

export function PublicCardClient({ data }: Props) {
  return (
    <div className="space-y-4">
      <EmergencyCardView data={data} isPublic />
      <div className="max-w-2xl mx-auto flex justify-center">
        <EmergencyCardPDFButton data={data} />
      </div>
    </div>
  )
}
