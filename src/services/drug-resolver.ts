// ── Drug Resolution Pipeline ────────────────────────────────────────
// Multi-step drug name resolution: local exact → fuzzy → RxNorm → CredibleMeds → AI.
// Returns the best available data from all sources for a given drug query.

import { lookupDrug, fuzzyLookupDrug } from '@/services/drug-lookup'
import { resolveDrugName } from '@/services/external/rxnorm-client'
import { lookupCredibleMeds } from '@/services/external/crediblemeds-client'
import { getTorsadesSignal } from '@/services/external/openfda-client'
import type { RxNormResult } from '@/services/external/rxnorm-client'
import type { CredibleMedsResult } from '@/services/external/crediblemeds-client'
import type { OpenFDASignal } from '@/services/external/openfda-client'
import type { DrugInfo, RiskCategory, DrugEnrichment, FuzzyMatchInfo } from '@/types'

// ── Types ───────────────────────────────────────────────────────────

export type ResolvedDrug = {
  genericName: string
  matchSource: 'LOCAL_EXACT' | 'LOCAL_FUZZY' | 'RXNORM' | 'CREDIBLEMEDS' | 'AI_ONLY'
  localEntry: DrugInfo | null
  credibleMedsData: CredibleMedsResult | null
  fdaSignal: OpenFDASignal | null
  rxnormData: RxNormResult | null
  confidence: number // 0.0-1.0
  enrichment: DrugEnrichment
  fuzzyMatch: FuzzyMatchInfo | null
}

// ── Risk Aggregation ────────────────────────────────────────────────

const RISK_PRIORITY: Record<RiskCategory, number> = {
  KNOWN_RISK: 4,
  POSSIBLE_RISK: 3,
  CONDITIONAL_RISK: 2,
  NOT_LISTED: 1,
}

/**
 * Aggregate risk from multiple sources — return the HIGHEST risk.
 * No false negatives: if ANY source flags a drug, the user sees a warning.
 */
export function aggregateRisk(
  localRisk: RiskCategory | null,
  credibleMedsRisk: RiskCategory | null,
): RiskCategory {
  const risks = [localRisk, credibleMedsRisk].filter(
    (r): r is RiskCategory => r !== null,
  )
  if (risks.length === 0) return 'NOT_LISTED'

  return risks.reduce((highest, current) =>
    RISK_PRIORITY[current] > RISK_PRIORITY[highest] ? current : highest,
  )
}

// ── Parallel Enrichment ─────────────────────────────────────────────

async function fetchEnrichment(
  genericName: string,
): Promise<{
  credibleMedsData: CredibleMedsResult | null
  fdaSignal: OpenFDASignal | null
  rxnormData: RxNormResult | null
}> {
  const [credibleMedsData, fdaSignal, rxnormData] = await Promise.all([
    lookupCredibleMeds(genericName).catch(() => null),
    getTorsadesSignal(genericName).catch(() => null),
    resolveDrugName(genericName).catch(() => null),
  ])
  return { credibleMedsData, fdaSignal, rxnormData }
}

function buildEnrichment(
  hasLocal: boolean,
  credibleMedsData: CredibleMedsResult | null,
  fdaSignal: OpenFDASignal | null,
  rxnormData: RxNormResult | null,
): DrugEnrichment {
  const dataSources: string[] = []
  if (hasLocal) dataSources.push('local_db')
  if (credibleMedsData) dataSources.push('crediblemeds_api')
  if (fdaSignal && fdaSignal.torsadesReportCount > 0) dataSources.push('openfda')
  if (rxnormData) dataSources.push('rxnorm')

  return {
    credibleMedsVerified: hasLocal || credibleMedsData !== null,
    fdaTorsadesReports: fdaSignal?.torsadesReportCount ?? null,
    rxnormResolved: rxnormData !== null,
    dataSources,
  }
}

// ── Main Resolution Pipeline ────────────────────────────────────────

/**
 * Resolve a drug query through multiple data sources.
 *
 * Pipeline:
 * 1. Local exact match (0ms) → if hit, enrich in parallel
 * 2. Local fuzzy match (0ms) → if hit, enrich in parallel
 * 3. RxNorm resolution (~500ms) → re-check local DB with resolved name
 * 4. CredibleMeds API (~500ms) → direct lookup
 * 5. AI_ONLY fallback
 */
export async function resolveDrug(query: string): Promise<ResolvedDrug> {
  const normalized = query.toLowerCase().trim()

  // ── Step 1: Local exact match ───────────────────────────────────
  const exactMatch = lookupDrug(normalized)
  if (exactMatch) {
    // Found locally — fire enrichment APIs in parallel (non-blocking for result)
    const enrichmentPromise = fetchEnrichment(exactMatch.genericName)

    // We can await enrichment since it's fast (3s timeout max) and adds value
    const { credibleMedsData, fdaSignal, rxnormData } = await enrichmentPromise

    return {
      genericName: exactMatch.genericName,
      matchSource: 'LOCAL_EXACT',
      localEntry: exactMatch,
      credibleMedsData,
      fdaSignal,
      rxnormData,
      confidence: 1.0,
      enrichment: buildEnrichment(true, credibleMedsData, fdaSignal, rxnormData),
      fuzzyMatch: null,
    }
  }

  // ── Step 2: Local fuzzy match ───────────────────────────────────
  const fuzzyResult = fuzzyLookupDrug(normalized)
  if (fuzzyResult && fuzzyResult.matchType === 'FUZZY' && fuzzyResult.confidence >= 0.7) {
    const { credibleMedsData, fdaSignal, rxnormData } = await fetchEnrichment(
      fuzzyResult.drug.genericName,
    )

    return {
      genericName: fuzzyResult.drug.genericName,
      matchSource: 'LOCAL_FUZZY',
      localEntry: fuzzyResult.drug,
      credibleMedsData,
      fdaSignal,
      rxnormData,
      confidence: fuzzyResult.confidence,
      enrichment: buildEnrichment(true, credibleMedsData, fdaSignal, rxnormData),
      fuzzyMatch: {
        originalQuery: query,
        matchedName: fuzzyResult.matchedTerm,
        confidence: fuzzyResult.confidence,
      },
    }
  }

  // ── Step 3: RxNorm resolution ───────────────────────────────────
  // Try RxNorm + CredibleMeds + OpenFDA in parallel
  const [rxnormResult, directCredibleMeds, directFdaSignal] = await Promise.all([
    resolveDrugName(normalized).catch(() => null),
    lookupCredibleMeds(normalized).catch(() => null),
    getTorsadesSignal(normalized).catch(() => null),
  ])

  if (rxnormResult) {
    // RxNorm resolved the name — re-check local DB with the canonical generic name
    const resolvedLocalEntry = lookupDrug(rxnormResult.genericName)
    if (resolvedLocalEntry) {
      // RxNorm resolved to a drug in our local DB
      const credibleMedsData = directCredibleMeds ?? await lookupCredibleMeds(rxnormResult.genericName).catch(() => null)

      return {
        genericName: resolvedLocalEntry.genericName,
        matchSource: 'RXNORM',
        localEntry: resolvedLocalEntry,
        credibleMedsData,
        fdaSignal: directFdaSignal,
        rxnormData: rxnormResult,
        confidence: Math.min(rxnormResult.score / 100, 0.95),
        enrichment: buildEnrichment(true, credibleMedsData, directFdaSignal, rxnormResult),
        fuzzyMatch: {
          originalQuery: query,
          matchedName: rxnormResult.genericName,
          confidence: Math.min(rxnormResult.score / 100, 0.95),
        },
      }
    }

    // RxNorm resolved but not in local DB — check CredibleMeds with resolved name
    const credibleMedsForResolved = directCredibleMeds
      ?? await lookupCredibleMeds(rxnormResult.genericName).catch(() => null)

    if (credibleMedsForResolved) {
      return {
        genericName: rxnormResult.genericName,
        matchSource: 'CREDIBLEMEDS',
        localEntry: null,
        credibleMedsData: credibleMedsForResolved,
        fdaSignal: directFdaSignal,
        rxnormData: rxnormResult,
        confidence: 0.85,
        enrichment: buildEnrichment(false, credibleMedsForResolved, directFdaSignal, rxnormResult),
        fuzzyMatch: {
          originalQuery: query,
          matchedName: rxnormResult.genericName,
          confidence: Math.min(rxnormResult.score / 100, 0.95),
        },
      }
    }

    // RxNorm resolved but no local or CredibleMeds match — still pass data to AI
    return {
      genericName: rxnormResult.genericName,
      matchSource: 'AI_ONLY',
      localEntry: null,
      credibleMedsData: null,
      fdaSignal: directFdaSignal,
      rxnormData: rxnormResult,
      confidence: 0.5,
      enrichment: buildEnrichment(false, null, directFdaSignal, rxnormResult),
      fuzzyMatch: {
        originalQuery: query,
        matchedName: rxnormResult.genericName,
        confidence: Math.min(rxnormResult.score / 100, 0.95),
      },
    }
  }

  // ── Step 4: CredibleMeds direct lookup ──────────────────────────
  if (directCredibleMeds) {
    return {
      genericName: directCredibleMeds.genericName,
      matchSource: 'CREDIBLEMEDS',
      localEntry: null,
      credibleMedsData: directCredibleMeds,
      fdaSignal: directFdaSignal,
      rxnormData: null,
      confidence: 0.85,
      enrichment: buildEnrichment(false, directCredibleMeds, directFdaSignal, null),
      fuzzyMatch: null,
    }
  }

  // ── Step 5: AI-only fallback ────────────────────────────────────
  return {
    genericName: normalized,
    matchSource: 'AI_ONLY',
    localEntry: null,
    credibleMedsData: null,
    fdaSignal: directFdaSignal,
    rxnormData: null,
    confidence: 0.3,
    enrichment: buildEnrichment(false, null, directFdaSignal, null),
    fuzzyMatch: null,
  }
}
