// ── Drug Resolution Pipeline ────────────────────────────────────────
// Multi-step drug name resolution: local exact → fuzzy → RxNorm → CredibleMeds → AI.
// Returns the best available data from all sources for a given drug query.

import { lookupDrug, fuzzyLookupDrug } from '@/services/drug-lookup'
import { resolveDrugName } from '@/services/external/rxnorm-client'
import { lookupCredibleMeds } from '@/services/external/crediblemeds-client'
import { getTorsadesSignal } from '@/services/external/openfda-client'
import { resolveBgBrandName } from '@/services/bg-drug-lookup'
import type { RxNormResult } from '@/services/external/rxnorm-client'
import type { CredibleMedsResult } from '@/services/external/crediblemeds-client'
import type { OpenFDASignal } from '@/services/external/openfda-client'
import type { DrugInfo, RiskCategory, DrugEnrichment, FuzzyMatchInfo, PipelineStep } from '@/types'

// ── Types ───────────────────────────────────────────────────────────

export type ResolvedDrug = {
  genericName: string
  matchSource: 'LOCAL_EXACT' | 'LOCAL_FUZZY' | 'BG_DATABASE' | 'RXNORM' | 'CREDIBLEMEDS' | 'AI_ONLY'
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
  onStep?: OnStepCallback,
): Promise<{
  credibleMedsData: CredibleMedsResult | null
  fdaSignal: OpenFDASignal | null
  rxnormData: RxNormResult | null
}> {
  function emitStep(step: PipelineStep) {
    trace.push(step)
    onStep?.(step)
  }

  const t = Date.now()
  const [credibleMedsData, fdaSignal, rxnormData] = await Promise.all([
    lookupCredibleMeds(genericName).catch(() => null),
    getTorsadesSignal(genericName).catch(() => null),
    resolveDrugName(genericName).catch(() => null),
  ])
  const d = Date.now() - t

  emitStep({
    name: 'QT Risk Verification',
    status: credibleMedsData ? 'HIT' : 'MISS',
    durationMs: d,
    detail: credibleMedsData
      ? `Risk level confirmed: ${credibleMedsData.riskCategory.replace('_', ' ').toLowerCase()}`
      : 'No additional risk data found',
  })

  emitStep({
    name: 'FDA Safety Reports',
    status: fdaSignal && fdaSignal.torsadesReportCount > 0 ? 'HIT' : 'MISS',
    durationMs: d,
    detail: fdaSignal && fdaSignal.torsadesReportCount > 0
      ? `${fdaSignal.torsadesReportCount} heart rhythm adverse event reports found`
      : 'No adverse event reports found',
  })

  emitStep({
    name: 'Drug Name Resolution',
    status: rxnormData ? 'HIT' : 'MISS',
    durationMs: d,
    detail: rxnormData
      ? `Identified as "${rxnormData.genericName}"`
      : 'Already identified',
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
export type OnStepCallback = (step: PipelineStep) => void

export async function resolveDrug(query: string, onStep?: OnStepCallback): Promise<ResolvedDrug> {
  const normalized = query.toLowerCase().trim()
  const trace: PipelineStep[] = []

  function emitStep(step: PipelineStep) {
    trace.push(step)
    onStep?.(step)
  }

  // ── Step 1: Local exact match ───────────────────────────────────
  const t1 = Date.now()
  const exactMatch = lookupDrug(normalized)
  const d1 = Date.now() - t1

  if (exactMatch) {
    emitStep({
      name: 'US Drug Safety Database',
      status: 'HIT',
      durationMs: d1,
      detail: `Found: ${exactMatch.genericName}`,
    })

    // Fire enrichment APIs in parallel with individual timing
    const enrichResult = await fetchEnrichmentWithTrace(exactMatch.genericName, trace, onStep)

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

  emitStep({
    name: 'US Drug Safety Database',
    status: 'MISS',
    durationMs: d1,
    detail: 'Not found in US database',
  })

  // ── Step 2: Local fuzzy match ───────────────────────────────────
  const t2 = Date.now()
  const fuzzyResult = fuzzyLookupDrug(normalized)
  const d2 = Date.now() - t2
  const fuzzyHit = fuzzyResult && fuzzyResult.matchType === 'FUZZY' && fuzzyResult.confidence >= 0.7

  if (fuzzyHit) {
    emitStep({
      name: 'Checking Similar Names',
      status: 'HIT',
      durationMs: d2,
      detail: `Did you mean "${fuzzyResult.drug.genericName}"? (${Math.round(fuzzyResult.confidence * 100)}% match)`,
    })

    const enrichResult = await fetchEnrichmentWithTrace(fuzzyResult.drug.genericName, trace, onStep)

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

  emitStep({
    name: 'Checking Similar Names',
    status: 'MISS',
    durationMs: d2,
    detail: 'No similar drug names found',
  })

  // ── Step 2b: Bulgarian brand name resolution ─────────────────────
  const t2b = Date.now()
  const bgResolved = await resolveBgBrandName(normalized)
  const d2b = Date.now() - t2b

  if (bgResolved) {
    emitStep({
      name: 'Bulgarian Drug Database',
      status: 'HIT',
      durationMs: d2b,
      detail: `Recognized "${bgResolved.brandName}" as ${bgResolved.inn}`,
    })

    // Try to match the resolved INN against local QT database
    const bgLocalMatch = lookupDrug(bgResolved.inn)
    const enrichResult = await fetchEnrichmentWithTrace(bgResolved.inn, trace, onStep)

    const bgEnrichment = buildEnrichment(!!bgLocalMatch, enrichResult.credibleMedsData, enrichResult.fdaSignal, enrichResult.rxnormData)
    bgEnrichment.dataSources = ['bg_positive_list', ...bgEnrichment.dataSources]

    return {
      genericName: bgLocalMatch?.genericName ?? bgResolved.inn,
      matchSource: 'BG_DATABASE',
      localEntry: bgLocalMatch,
      credibleMedsData: enrichResult.credibleMedsData,
      fdaSignal: enrichResult.fdaSignal,
      rxnormData: enrichResult.rxnormData,
      confidence: bgLocalMatch ? 0.95 : 0.7,
      enrichment: bgEnrichment,
      fuzzyMatch: {
        originalQuery: query,
        matchedName: bgResolved.inn,
        confidence: 0.95,
      },
      pipelineTrace: trace,
    }
  }

  emitStep({
    name: 'Bulgarian Drug Database',
    status: 'MISS',
    durationMs: d2b,
    detail: 'Not found in Bulgarian database',
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
  emitStep({
    name: 'Drug Name Resolution',
    status: rxnormResult ? 'HIT' : 'MISS',
    durationMs: d3,
    detail: rxnormResult
      ? `Identified as "${rxnormResult.genericName}"`
      : 'Could not identify drug name',
  })

  emitStep({
    name: 'QT Risk Verification',
    status: directCredibleMeds ? 'HIT' : 'MISS',
    durationMs: d3,
    detail: directCredibleMeds
      ? `Risk level confirmed: ${directCredibleMeds.riskCategory.replace('_', ' ').toLowerCase()}`
      : 'No additional risk data found',
  })

  emitStep({
    name: 'FDA Safety Reports',
    status: directFdaSignal && directFdaSignal.torsadesReportCount > 0 ? 'HIT' : 'MISS',
    durationMs: d3,
    detail: directFdaSignal && directFdaSignal.torsadesReportCount > 0
      ? `${directFdaSignal.torsadesReportCount} heart rhythm adverse event reports found`
      : 'No adverse event reports found',
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
  emitStep({
    name: 'AI Safety Review',
    status: 'HIT',
    durationMs: 0,
    detail: 'No database match — running AI safety assessment',
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
