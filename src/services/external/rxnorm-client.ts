// Free NIH API for drug name resolution with fuzzy matching.
// Resolves typos, brand names, international names → canonical generic name.
// No API key needed. Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html

import { EXTERNAL_API_CONFIG } from './config'

export type RxNormResult = {
  rxcui: string
  genericName: string
  score: number // match quality from approximate match
}

type ApproxMatchResponse = {
  approximateGroup?: {
    candidate?: Array<{
      rxcui: string
      score: string
      rank: string
      name?: string
    }>
  }
}

type RxConceptResponse = {
  rxnormdata?: {
    idGroup?: {
      rxnormId?: string[]
    }
  }
}

type PropertiesResponse = {
  properties?: {
    rxcui: string
    name: string
    tty: string // term type: IN=ingredient, BN=brand, etc.
  }
}


const cache = new Map<string, { result: RxNormResult | null; timestamp: number }>()

function getCached(key: string): RxNormResult | null | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > EXTERNAL_API_CONFIG.cacheTtlMs) {
    cache.delete(key)
    return undefined
  }
  return entry.result
}

function setCache(key: string, result: RxNormResult | null): void {
  cache.set(key, { result, timestamp: Date.now() })
}


async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_API_CONFIG.rxnorm.timeoutMs,
  )
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}


/**
 * Resolve a drug name using RxNorm approximate matching.
 * Handles typos, brand names, abbreviations, international names.
 * Returns null if no match found or API unavailable.
 */
export async function resolveDrugName(
  query: string,
): Promise<RxNormResult | null> {
  if (!EXTERNAL_API_CONFIG.rxnorm.enabled) return null

  const normalized = query.toLowerCase().trim()
  if (!normalized || normalized.length < 2) return null

  const cached = getCached(`resolve:${normalized}`)
  if (cached !== undefined) return cached

  try {
    const url = `${EXTERNAL_API_CONFIG.rxnorm.baseUrl}/approximateTerm.json?term=${encodeURIComponent(normalized)}&maxEntries=3`
    const response = await fetchWithTimeout(url)
    if (!response.ok) return null

    const data = (await response.json()) as ApproxMatchResponse
    const candidates = data.approximateGroup?.candidate
    if (!candidates || candidates.length === 0) {
      setCache(`resolve:${normalized}`, null)
      return null
    }

    // Get the top candidate and fetch its properties for the generic name
    const top = candidates[0]
    const propsUrl = `${EXTERNAL_API_CONFIG.rxnorm.baseUrl}/rxcui/${top.rxcui}/properties.json`
    const propsResponse = await fetchWithTimeout(propsUrl)

    let genericName = top.name ?? normalized
    if (propsResponse.ok) {
      const propsData = (await propsResponse.json()) as PropertiesResponse
      if (propsData.properties?.name) {
        genericName = propsData.properties.name.toLowerCase()
      }
    }

    // Clean the generic name: strip dosage/form info if present
    // RxNorm sometimes returns "amoxicillin 500 MG Oral Capsule" — we just want "amoxicillin"
    const cleanName = genericName.split(/\s+\d/)[0].trim()

    const result: RxNormResult = {
      rxcui: top.rxcui,
      genericName: cleanName,
      score: parseInt(top.score, 10) || 0,
    }

    setCache(`resolve:${normalized}`, result)
    return result
  } catch (err) {
    console.error('[rxnorm-client] Failed to resolve drug name:', err)
    setCache(`resolve:${normalized}`, null)
    return null
  }
}

/**
 * Get RxCUI for an exact drug name (used for cross-referencing).
 * Returns null if not found or API unavailable.
 */
export async function getRxCuiByName(
  name: string,
): Promise<string | null> {
  if (!EXTERNAL_API_CONFIG.rxnorm.enabled) return null

  const normalized = name.toLowerCase().trim()
  if (!normalized) return null

  const cached = getCached(`rxcui:${normalized}`)
  if (cached !== undefined) return cached?.rxcui ?? null

  try {
    const url = `${EXTERNAL_API_CONFIG.rxnorm.baseUrl}/rxcui.json?name=${encodeURIComponent(normalized)}`
    const response = await fetchWithTimeout(url)
    if (!response.ok) return null

    const data = (await response.json()) as RxConceptResponse
    const ids = data.rxnormdata?.idGroup?.rxnormId
    if (!ids || ids.length === 0) return null

    return ids[0]
  } catch (err) {
    console.error('[rxnorm-client] Failed to get RxCUI:', err)
    return null
  }
}
