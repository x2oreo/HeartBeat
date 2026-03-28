// Free FDA Adverse Event Reporting System (FAERS) API.
// Returns torsades de pointes adverse event report counts for a drug.
// No API key needed (40 req/min). Docs: https://open.fda.gov/apis/drug/event/

import { EXTERNAL_API_CONFIG } from './config'

export type OpenFDASignal = {
  torsadesReportCount: number
  signalStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'
}

type FDAEventResponse = {
  meta?: {
    results?: {
      total?: number
    }
  }
  error?: {
    code: string
    message: string
  }
}


const cache = new Map<string, { result: OpenFDASignal | null; timestamp: number }>()

function getCached(key: string): OpenFDASignal | null | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > EXTERNAL_API_CONFIG.cacheTtlMs) {
    cache.delete(key)
    return undefined
  }
  return entry.result
}

function setCache(key: string, result: OpenFDASignal | null): void {
  cache.set(key, { result, timestamp: Date.now() })
}


function classifySignal(count: number): OpenFDASignal['signalStrength'] {
  if (count >= 50) return 'STRONG'
  if (count >= 10) return 'MODERATE'
  if (count >= 1) return 'WEAK'
  return 'NONE'
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_API_CONFIG.openfda.timeoutMs,
  )
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}


/**
 * Get torsades de pointes adverse event signal for a drug from FDA FAERS.
 * Returns the number of torsades reports and a signal strength classification.
 * Returns null if API unavailable or drug not found.
 */
export async function getTorsadesSignal(
  genericName: string,
): Promise<OpenFDASignal | null> {
  if (!EXTERNAL_API_CONFIG.openfda.enabled) return null

  const normalized = genericName.toLowerCase().trim()
  if (!normalized) return null

  const cached = getCached(normalized)
  if (cached !== undefined) return cached

  try {
    // Search for adverse events where the drug is involved AND torsades de pointes was reported
    const searchTerm = `patient.drug.openfda.generic_name:"${encodeURIComponent(normalized)}"+AND+patient.reaction.reactionmeddrapt:"torsade+de+pointes"`
    const apiKeyParam = EXTERNAL_API_CONFIG.openfda.apiKey
      ? `&api_key=${EXTERNAL_API_CONFIG.openfda.apiKey}`
      : ''

    const url = `${EXTERNAL_API_CONFIG.openfda.baseUrl}/event.json?search=${searchTerm}&limit=1${apiKeyParam}`
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      // 404 means no results found — that's a valid "NONE" signal
      if (response.status === 404) {
        const result: OpenFDASignal = { torsadesReportCount: 0, signalStrength: 'NONE' }
        setCache(normalized, result)
        return result
      }
      setCache(normalized, null)
      return null
    }

    const data = (await response.json()) as FDAEventResponse

    if (data.error) {
      // API returned error (e.g., no matches) — treat as no signal
      const result: OpenFDASignal = { torsadesReportCount: 0, signalStrength: 'NONE' }
      setCache(normalized, result)
      return result
    }

    const count = data.meta?.results?.total ?? 0
    const result: OpenFDASignal = {
      torsadesReportCount: count,
      signalStrength: classifySignal(count),
    }

    setCache(normalized, result)
    return result
  } catch (err) {
    console.error('[openfda-client] Failed to get torsades signal:', err)
    setCache(normalized, null)
    return null
  }
}
