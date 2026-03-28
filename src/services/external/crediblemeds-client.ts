// THE authoritative source for QT drug risk classification.
// Requires API key (env var CREDIBLEMEDS_API_KEY). Optional — system works without it.
// Docs: https://api.crediblemeds.org/index.php/api-manual/

import { EXTERNAL_API_CONFIG } from './config'
import type { RiskCategory } from '@/types'

export type CredibleMedsResult = {
  genericName: string
  brandNames: string[]
  riskCategory: RiskCategory
  isDTA: boolean
  drugClass: string
  rxnormId: string | null
  atcCode: string | null
}

type CredibleMedsResponse = {
  Meta?: {
    disclaimer?: string
    last_update?: string
  }
  Results?: Array<{
    generic_name?: string
    brand?: string
    class?: string
    tdp_risk_category?: string // R, P, C, A
    therapeutic_use?: string
    rxnorm_id?: string
    atc_code?: string
  }>
}


const cache = new Map<string, { result: CredibleMedsResult | null; timestamp: number }>()

function getCached(key: string): CredibleMedsResult | null | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > EXTERNAL_API_CONFIG.cacheTtlMs) {
    cache.delete(key)
    return undefined
  }
  return entry.result
}

function setCache(key: string, result: CredibleMedsResult | null): void {
  cache.set(key, { result, timestamp: Date.now() })
}


/** Map CredibleMeds risk categories to our RiskCategory type. */
function mapRiskCategory(category: string): RiskCategory {
  switch (category.toUpperCase()) {
    case 'R':
      return 'KNOWN_RISK'
    case 'P':
      return 'POSSIBLE_RISK'
    case 'C':
      return 'CONDITIONAL_RISK'
    case 'A':
      return 'KNOWN_RISK' // "Drugs to Avoid in CLQTS" = highest risk
    default:
      return 'POSSIBLE_RISK' // Conservative default
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_API_CONFIG.crediblemeds.timeoutMs,
  )
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}


/**
 * Look up a drug in the CredibleMeds database.
 * Returns the official QT risk classification.
 * Returns null if API key is missing, drug not found, or API unavailable.
 */
export async function lookupCredibleMeds(
  genericName: string,
): Promise<CredibleMedsResult | null> {
  if (!EXTERNAL_API_CONFIG.crediblemeds.enabled) return null

  const normalized = genericName.toLowerCase().trim()
  if (!normalized) return null

  const cached = getCached(normalized)
  if (cached !== undefined) return cached

  try {
    const url = `${EXTERNAL_API_CONFIG.crediblemeds.baseUrl}?api_key=${EXTERNAL_API_CONFIG.crediblemeds.apiKey}&search=generic_name:${encodeURIComponent(normalized)}`
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      setCache(normalized, null)
      return null
    }

    const data = (await response.json()) as CredibleMedsResponse
    const results = data.Results
    if (!results || results.length === 0) {
      setCache(normalized, null)
      return null
    }

    const entry = results[0]
    const riskCat = entry.tdp_risk_category ?? 'P'

    const result: CredibleMedsResult = {
      genericName: entry.generic_name?.toLowerCase() ?? normalized,
      brandNames: entry.brand ? entry.brand.split(/[,;]/).map((b) => b.trim()).filter(Boolean) : [],
      riskCategory: mapRiskCategory(riskCat),
      isDTA: riskCat.toUpperCase() === 'A' || riskCat.toUpperCase() === 'R',
      drugClass: entry.class ?? 'Unknown',
      rxnormId: entry.rxnorm_id ?? null,
      atcCode: entry.atc_code ?? null,
    }

    setCache(normalized, result)
    return result
  } catch (err) {
    console.error('[crediblemeds-client] Failed to lookup drug:', err)
    setCache(normalized, null)
    return null
  }
}
