import { generateObject } from 'ai'
import { model } from '@/ai/client'
import { DetectedDrugsSchema } from '@/ai/scan-schemas'
import { buildPhotoScanPrompt } from '@/ai/prompts'
import { scanDrugByText } from '@/services/drug-scanner'
import type { PhotoScanResult } from '@/types'

/**
 * Detect if a base64 string is a HEIC/HEIF image by checking magic bytes.
 * HEIC files have "ftyp" at byte offset 4, followed by a HEIF brand.
 */
function isHeicBase64(base64: string): boolean {
  // Check enough bytes for the ftyp box header + brand
  const header = base64.slice(0, 48)
  try {
    const bytes = Buffer.from(header, 'base64')
    // ftyp box: bytes 4-7 should be "ftyp"
    if (bytes.length < 12) return false
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
    if (ftyp !== 'ftyp') return false
    // Brand at bytes 8-11 indicates HEIF container
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    const heifBrands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1']
    return heifBrands.includes(brand)
  } catch {
    return false
  }
}

/**
 * Convert a HEIC image (base64) to JPEG (base64) using heic-convert.
 */
async function convertHeicToJpegServer(base64: string): Promise<string> {
  const convert = (await import('heic-convert')).default
  const inputBuffer = Buffer.from(base64, 'base64')
  const outputBuffer = await convert({
    buffer: new Uint8Array(inputBuffer),
    format: 'JPEG',
    quality: 0.85,
  })
  return Buffer.from(outputBuffer).toString('base64')
}

/**
 * Scan a photo of medication packaging using Claude Vision.
 * Detects drug names from the image, then runs each through the text scanner.
 */
export async function scanDrugByPhoto(
  imageBase64: string,
  userId: string,
): Promise<PhotoScanResult> {
  // Convert HEIC to JPEG if needed (HEIC is not supported by all vision APIs)
  let processedImage = imageBase64
  if (isHeicBase64(imageBase64)) {
    processedImage = await convertHeicToJpegServer(imageBase64)
  }

  // Step 1: Use Claude Vision to detect drug names from the image
  const { object: detected } = await generateObject({
    model,
    schema: DetectedDrugsSchema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildPhotoScanPrompt() },
          { type: 'image', image: processedImage },
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

  // Step 3: Run text scans in parallel for each detected drug, passing dosage when available
  const drugDosageMap = new Map(
    detected.drugs
      .filter((d) => d.confidence !== 'LOW' && d.dosage)
      .map((d) => [d.name, d.dosage]),
  )

  const results = await Promise.allSettled(
    drugNames.map((name) => scanDrugByText(name, userId, drugDosageMap.get(name))),
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
