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
import type { DrugInfo, RiskCategory, DrugEnrichment, FuzzyMatchInfo, PipelineStep } from '@/types'

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
  pipelineTrace: PipelineStep[]
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

// ── Enrichment with Pipeline Tracing ─────────────────────────────────

async function fetchEnrichmentWithTrace(
  genericName: string,
  trace: PipelineStep[],
): Promise<{
  credibleMedsData: CredibleMedsResult | null
  fdaSignal: OpenFDASignal | null
  rxnormData: RxNormResult | null
}> {
  const t = Date.now()
  const [credibleMedsData, fdaSignal, rxnormData] = await Promise.all([
    lookupCredibleMeds(genericName).catch(() => null),
    getTorsadesSignal(genericName).catch(() => null),
    resolveDrugName(genericName).catch(() => null),
  ])
  const d = Date.now() - t

  trace.push({
    name: 'CredibleMeds API',
    status: credibleMedsData ? 'HIT' : 'MISS',
    durationMs: d,
    detail: credibleMedsData
      ? `${credibleMedsData.riskCategory} confirmed${credibleMedsData.isDTA ? ' (DTA)' : ''}`
      : 'Not found in CredibleMeds',
  })

  trace.push({
    name: 'FDA FAERS (OpenFDA)',
    status: fdaSignal && fdaSignal.torsadesReportCount > 0 ? 'HIT' : 'MISS',
    durationMs: d,
    detail: fdaSignal && fdaSignal.torsadesReportCount > 0
      ? `${fdaSignal.torsadesReportCount} Torsades de Pointes adverse event reports`
      : 'No TdP signal found',
  })

  trace.push({
    name: 'RxNorm API',
    status: rxnormData ? 'HIT' : 'MISS',
    durationMs: d,
    detail: rxnormData
      ? `Resolved to "${rxnormData.genericName}" (score: ${rxnormData.score})`
      : 'No resolution needed (already matched locally)',
  })

  return { credibleMedsData, fdaSignal, rxnormData }
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
  const trace: PipelineStep[] = []

  // ── Step 1: Local exact match ───────────────────────────────────
  const t1 = Date.now()
  const exactMatch = lookupDrug(normalized)
  const d1 = Date.now() - t1

  if (exactMatch) {
    trace.push({
      name: 'Local DB (111 drugs)',
      status: 'HIT',
      durationMs: d1,
      detail: `Matched "${normalized}" → ${exactMatch.genericName}`,
    })

    // Fire enrichment APIs in parallel with individual timing
    const enrichResult = await fetchEnrichmentWithTrace(exactMatch.genericName, trace)

    return {
      genericName: exactMatch.genericName,
      matchSource: 'LOCAL_EXACT',
      localEntry: exactMatch,
      credibleMedsData: enrichResult.credibleMedsData,
      fdaSignal: enrichResult.fdaSignal,
      rxnormData: enrichResult.rxnormData,
      confidence: 1.0,
      enrichment: buildEnrichment(true, enrichResult.credibleMedsData, enrichResult.fdaSignal, enrichResult.rxnormData),
      fuzzyMatch: null,
      pipelineTrace: trace,
    }
  }

  trace.push({
    name: 'Local DB (111 drugs)',
    status: 'MISS',
    durationMs: d1,
    detail: `No exact match for "${normalized}"`,
  })

  // ── Step 2: Local fuzzy match ───────────────────────────────────
  const t2 = Date.now()
  const fuzzyResult = fuzzyLookupDrug(normalized)
  const d2 = Date.now() - t2
  const fuzzyHit = fuzzyResult && fuzzyResult.matchType === 'FUZZY' && fuzzyResult.confidence >= 0.7

  if (fuzzyHit) {
    trace.push({
      name: 'Fuzzy Match (Levenshtein)',
      status: 'HIT',
      durationMs: d2,
      detail: `"${normalized}" → ${fuzzyResult.drug.genericName} (${Math.round(fuzzyResult.confidence * 100)}% confidence)`,
    })

    const enrichResult = await fetchEnrichmentWithTrace(fuzzyResult.drug.genericName, trace)

    return {
      genericName: fuzzyResult.drug.genericName,
      matchSource: 'LOCAL_FUZZY',
      localEntry: fuzzyResult.drug,
      credibleMedsData: enrichResult.credibleMedsData,
      fdaSignal: enrichResult.fdaSignal,
      rxnormData: enrichResult.rxnormData,
      confidence: fuzzyResult.confidence,
      enrichment: buildEnrichment(true, enrichResult.credibleMedsData, enrichResult.fdaSignal, enrichResult.rxnormData),
      fuzzyMatch: {
        originalQuery: query,
        matchedName: fuzzyResult.matchedTerm,
        confidence: fuzzyResult.confidence,
      },
      pipelineTrace: trace,
    }
  }

  trace.push({
    name: 'Fuzzy Match (Levenshtein)',
    status: 'MISS',
    durationMs: d2,
    detail: fuzzyResult
      ? `Best: ${fuzzyResult.drug.genericName} (${Math.round(fuzzyResult.confidence * 100)}% — below 70% threshold)`
      : 'No close matches found',
  })

  // ── Step 3: RxNorm + CredibleMeds + OpenFDA in parallel ─────────
  const t3 = Date.now()
  const [rxnormResult, directCredibleMeds, directFdaSignal] = await Promise.all([
    resolveDrugName(normalized).catch(() => null),
    lookupCredibleMeds(normalized).catch(() => null),
    getTorsadesSignal(normalized).catch(() => null),
  ])
  const d3 = Date.now() - t3

  // Add individual trace entries for each external API
  trace.push({
    name: 'RxNorm API',
    status: rxnormResult ? 'HIT' : 'MISS',
    durationMs: d3,
    detail: rxnormResult
      ? `Resolved to "${rxnormResult.genericName}" (score: ${rxnormResult.score})`
      : `No resolution for "${normalized}"`,
  })

  trace.push({
    name: 'CredibleMeds API',
    status: directCredibleMeds ? 'HIT' : 'MISS',
    durationMs: d3,
    detail: directCredibleMeds
      ? `${directCredibleMeds.riskCategory}${directCredibleMeds.isDTA ? ' (DTA)' : ''}`
      : 'Not found in CredibleMeds',
  })

  trace.push({
    name: 'FDA FAERS (OpenFDA)',
    status: directFdaSignal && directFdaSignal.torsadesReportCount > 0 ? 'HIT' : 'MISS',
    durationMs: d3,
    detail: directFdaSignal && directFdaSignal.torsadesReportCount > 0
      ? `${directFdaSignal.torsadesReportCount} Torsades de Pointes adverse event reports`
      : 'No TdP signal found',
  })

  if (rxnormResult) {
    const resolvedLocalEntry = lookupDrug(rxnormResult.genericName)
    if (resolvedLocalEntry) {
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
        pipelineTrace: trace,
      }
    }

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
        pipelineTrace: trace,
      }
    }

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
      pipelineTrace: trace,
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
      pipelineTrace: trace,
    }
  }

  // ── Step 5: AI-only fallback ────────────────────────────────────
  trace.push({
    name: 'AI Fallback',
    status: 'HIT',
    durationMs: 0,
    detail: 'No verified sources found — AI will assess this drug',
  })

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
    pipelineTrace: trace,
  }
}
