import { memo } from 'react'

type Props = {
  specialty: string
  patientName: string
  genotype: string | null
  medicationNames: string[]
  avoidCount: number
  warningCount: number
  summary: string
}

export const DocumentThumbnail = memo(function DocumentThumbnail({
  specialty,
  patientName,
  genotype,
  medicationNames,
  avoidCount,
  warningCount,
  summary,
}: Props) {
  return (
    <div className="rounded-xl overflow-hidden select-none bg-surface-raised border border-separator-light">
      {/* Compact header — specialty + patient */}
      <div className="bg-brand px-3 py-2">
        <p className="text-[11px] font-bold text-white truncate">{specialty}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-white/70 truncate">{patientName}</span>
          {genotype && (
            <span className="text-[9px] text-white/60 bg-white/15 px-1.5 py-px rounded flex-shrink-0">
              {genotype}
            </span>
          )}
        </div>
      </div>

      {/* Summary — the main readable content */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] leading-[1.5] text-text-secondary line-clamp-4">
          {summary || 'No summary available'}
        </p>
      </div>

      {/* Footer stats — medications + warnings */}
      <div className="px-3 pb-2.5 flex flex-wrap gap-1">
        {medicationNames.length > 0 && (
          <span className="text-[9px] font-medium text-brand bg-brand-light px-1.5 py-0.5 rounded">
            {medicationNames.length} med{medicationNames.length !== 1 ? 's' : ''}
          </span>
        )}
        {avoidCount > 0 && (
          <span className="text-[9px] font-medium text-[#C41E16] bg-[#FFEDEC] px-1.5 py-0.5 rounded">
            {avoidCount} avoid
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-[9px] font-medium text-[#8A5600] bg-[#FFF5E0] px-1.5 py-0.5 rounded">
            {warningCount} warn
          </span>
        )}
      </div>
    </div>
  )
})
