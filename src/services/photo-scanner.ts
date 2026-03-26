import { generateObject } from 'ai'
import { model } from '@/ai/client'
import { DetectedDrugsSchema } from '@/ai/scan-schemas'
import { buildPhotoScanPrompt } from '@/ai/prompts'
import { scanDrugByText } from '@/services/drug-scanner'
import type { PhotoScanResult } from '@/types'

/**
 * Scan a photo of medication packaging using Claude Vision.
 * Detects drug names from the image, then runs each through the text scanner.
 */
export async function scanDrugByPhoto(
  imageBase64: string,
  userId: string,
): Promise<PhotoScanResult> {
  // Step 1: Use Claude Vision to detect drug names from the image
  const { object: detected } = await generateObject({
    model,
    schema: DetectedDrugsSchema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildPhotoScanPrompt() },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
    temperature: 0,
  })

  // If image is unreadable, return early
  if (detected.imageQuality === 'UNREADABLE') {
    return {
      detectedDrugNames: [],
      scanResults: [],
      unrecognizedText: [detected.notes ?? 'Could not read medication from photo. Please type the name instead.'],
    }
  }

  // Step 2: Filter to medium/high confidence detections
  const drugNames = detected.drugs
    .filter((d) => d.confidence !== 'LOW')
    .map((d) => d.name)

  if (drugNames.length === 0) {
    return {
      detectedDrugNames: [],
      scanResults: [],
      unrecognizedText: ['No medication names detected with sufficient confidence.'],
    }
  }

  // Step 3: Run text scans in parallel for each detected drug
  const results = await Promise.allSettled(
    drugNames.map((name) => scanDrugByText(name, userId)),
  )

  const scanResults = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof scanDrugByText>>> => r.status === 'fulfilled')
    .map((r) => r.value)

  const unrecognizedText = results
    .map((r, i) => (r.status === 'rejected' ? drugNames[i] : null))
    .filter((name): name is string => name !== null)

  return {
    detectedDrugNames: drugNames,
    scanResults,
    unrecognizedText,
  }
}
