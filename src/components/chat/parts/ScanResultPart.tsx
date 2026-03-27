'use client'

import type { ScanResult, PhotoScanResult } from '@/types'
import { ResultCard } from '@/components/shared/ResultCard'
import { PipelineTrace } from '@/components/shared/PipelineTrace'

function isScanResult(data: unknown): data is ScanResult {
  return typeof data === 'object' && data !== null && 'genericName' in data && 'riskCategory' in data
}

function isPhotoScanResult(data: unknown): data is PhotoScanResult {
  return typeof data === 'object' && data !== null && 'scanResults' in data && Array.isArray((data as PhotoScanResult).scanResults)
}

export function ScanResultPart({ result, isPhoto = false }: { result: unknown; isPhoto?: boolean }) {
  // Handle photo scan results
  if (isPhoto && isPhotoScanResult(result)) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface-raised p-4 card-shadow">
          <p className="text-sm text-text-secondary">
            Detected <strong className="text-text-primary">{result.detectedDrugNames.length}</strong> medication{result.detectedDrugNames.length !== 1 ? 's' : ''} from photo
          </p>
          {result.unrecognizedText.length > 0 && (
            <p className="mt-1 text-xs text-text-tertiary">
              Could not analyze: {result.unrecognizedText.join(', ')}
            </p>
          )}
        </div>
        {result.scanResults.map((scanResult, i) => (
          <div key={i} className="space-y-3">
            <ResultCard result={scanResult} showActions={false} compact />
            {scanResult.pipelineTrace && scanResult.pipelineTrace.length > 0 && (
              <PipelineTrace steps={scanResult.pipelineTrace} />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Handle single drug scan result
  if (isScanResult(result)) {
    return (
      <div className="space-y-3">
        <ResultCard result={result} showActions={false} compact />
        {result.pipelineTrace && result.pipelineTrace.length > 0 && (
          <PipelineTrace steps={result.pipelineTrace} />
        )}
      </div>
    )
  }

  return null
}
