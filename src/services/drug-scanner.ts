import { generateObject } from 'ai'
import { model } from '@/ai/client'
import { ComboAnalysisSchema, UnknownDrugSchema } from '@/ai/scan-schemas'
import type { ComboAnalysis, UnknownDrug } from '@/ai/scan-schemas'
import {
  buildComboPrompt,
  buildUnknownDrugPrompt,
  buildEnrichedUnknownDrugPrompt,
  buildComboPromptForUnknownDrug,
  buildComboPromptWithDosage,
} from '@/ai/scan-prompts'
import type { MedicationWithCyp, EnrichmentData } from '@/ai/scan-prompts'
import { resolveDrug, aggregateRisk } from '@/services/drug-resolver'
import { notifyWatchOfDrugRisk } from '@/services/watch-push'
import type { ResolvedDrug, OnStepCallback } from '@/services/drug-resolver'
import { prisma } from '@/lib/prisma'
import type {
  ScanResult,
  ComboAnalysisResult,
  DrugInfo,
  QtDrugEntry,
  RiskCategory,
  RiskSource,
  CypData,
  ComboRiskLevel,
  PipelineStep,
} from '@/types'


const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const scanCache = new Map<string, { result: ScanResult; timestamp: number }>()

function getCacheKey(userId: string, drugName: string): string {
  return `${userId}:${drugName.toLowerCase().trim()}`
}

function getCachedResult(userId: string, drugName: string): ScanResult | null {
  const key = getCacheKey(userId, drugName)
  const entry = scanCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    scanCache.delete(key)
    return null
  }
  return entry.result
}

function setCachedResult(userId: string, drugName: string, result: ScanResult): void {
  const key = getCacheKey(userId, drugName)
  scanCache.set(key, { result, timestamp: Date.now() })
}

/** Clear scan cache for a user (call when medications change). */
export function clearScanCache(userId: string): void {
  for (const key of scanCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      scanCache.delete(key)
    }
  }
}


/** Convert DrugInfo (from lookupDrug) to QtDrugEntry (for buildComboPrompt). */
function drugInfoToQtDrugEntry(info: DrugInfo): QtDrugEntry {
  return {
    genericName: info.genericName,
    searchTerms: [info.genericName, ...info.brandNames],
    riskCategory: info.riskCategory,
    isDTA: info.isDTA,
    drugClass: info.drugClass,
    primaryUse: info.primaryUse,
    qtMechanism: info.qtMechanism,
    cyp: info.cyp,
  }
}

/** Map AI interaction type to a severity level for the shared DrugInteraction type. */
function interactionTypeToSeverity(
  type: 'ADDITIVE_QT' | 'CYP_INHIBITION' | 'CYP_INDUCTION' | 'OTHER',
): ComboRiskLevel {
  switch (type) {
    case 'ADDITIVE_QT':
      return 'HIGH'
    case 'CYP_INHIBITION':
      return 'HIGH'
    case 'CYP_INDUCTION':
      return 'LOW'
    case 'OTHER':
      return 'MEDIUM'
  }
}

/** Map AI ComboAnalysis schema output to the shared ComboAnalysisResult type. */
function mapComboAnalysis(ai: ComboAnalysis): ComboAnalysisResult {
  return {
    comboRiskLevel: ai.comboRisk.level,
    summary: ai.comboRisk.explanation,
    interactions: ai.comboRisk.interactions.map((i) => ({
      drugA: i.drug1,
      drugB: i.drug2,
      mechanism: i.mechanism,
      severity: interactionTypeToSeverity(i.type),
    })),
    alternatives: ai.alternatives.map((a) => ({
      genericName: a.genericName,
      drugClass: a.drugClass,
      whySafer: a.whySafer,
    })),
    genotypeConsiderations: ai.genotypeConsiderations,
  }
}

/** Map AI qtRiskAssessment to RiskCategory (conservative). */
function mapQtRiskToCategory(
  risk: UnknownDrug['qtRiskAssessment'],
): RiskCategory {
  switch (risk) {
    case 'LIKELY_SAFE':
      return 'NOT_LISTED'
    case 'POSSIBLE_RISK':
      return 'POSSIBLE_RISK'
    case 'UNKNOWN':
      return 'CONDITIONAL_RISK'
    case 'NOT_A_DRUG':
      return 'CONDITIONAL_RISK'
  }
}

/** Determine the best RiskSource based on resolution data. */
function determineSource(resolved: ResolvedDrug): RiskSource {
  const hasLocal = resolved.localEntry !== null
  const hasCredibleMeds = resolved.credibleMedsData !== null
  const hasExternalData = resolved.fdaSignal !== null || hasCredibleMeds || resolved.rxnormData !== null

  if (resolved.matchSource === 'BG_DATABASE') return 'BG_VERIFIED'
  if (hasLocal && hasCredibleMeds) return 'MULTI_SOURCE'
  if (hasLocal) return 'CREDIBLEMEDS_VERIFIED'
  if (hasCredibleMeds) return 'CREDIBLEMEDS_API'
  if (hasExternalData) return 'AI_ENRICHED'
  return 'AI_ASSESSED'
}

/** Build a ScanResult from an AI unknown drug assessment with enrichment. */
function mapUnknownDrugToScanResult(
  drugName: string,
  ai: UnknownDrug,
  resolved: ResolvedDrug,
): ScanResult {
  // Aggregate risk: if CredibleMeds says it's risky, use that over AI assessment
  const aiRisk = mapQtRiskToCategory(ai.qtRiskAssessment)
  const credibleMedsRisk = resolved.credibleMedsData?.riskCategory ?? null
  const finalRisk = aggregateRisk(aiRisk, credibleMedsRisk)

  return {
    drugName,
    genericName: ai.genericName ?? resolved.genericName,
    riskCategory: finalRisk,
    isDTA: resolved.credibleMedsData?.isDTA ?? false,
    drugClass: ai.drugClass ?? resolved.credibleMedsData?.drugClass ?? 'Unknown',
    primaryUse: ai.primaryUse ?? 'Unknown',
    qtMechanism: ai.recommendation
      ? `${ai.reasoning}\n\n${ai.recommendation}`
      : ai.reasoning,
    cyp: { metabolizedBy: [], inhibits: [], induces: [] },
    source: determineSource(resolved),
    comboAnalysis: null,
    scannedAt: new Date().toISOString(),
    enrichment: resolved.enrichment,
    dosage: null,
    fuzzyMatch: resolved.fuzzyMatch,
  }
}

/** Build a base ScanResult from a verified DrugInfo lookup with enrichment. */
function drugInfoToScanResult(
  drugName: string,
  info: DrugInfo,
  resolved: ResolvedDrug,
): ScanResult {
  // Aggregate risk from all sources (highest wins)
  const credibleMedsRisk = resolved.credibleMedsData?.riskCategory ?? null
  const finalRisk = aggregateRisk(info.riskCategory, credibleMedsRisk)

  return {
    drugName,
    genericName: info.genericName,
    riskCategory: finalRisk,
    isDTA: info.isDTA || (resolved.credibleMedsData?.isDTA ?? false),
    drugClass: info.drugClass,
    primaryUse: info.primaryUse,
    qtMechanism: info.qtMechanism,
    cyp: info.cyp,
    source: determineSource(resolved),
    comboAnalysis: null,
    scannedAt: new Date().toISOString(),
    enrichment: resolved.enrichment,
    dosage: null,
    fuzzyMatch: resolved.fuzzyMatch,
  }
}

/** Save scan result to the ScanLog table. Non-fatal — errors are logged but don't crash the scan. */
async function saveScanLog(
  userId: string,
  drugName: string,
  result: ScanResult,
): Promise<void> {
  try {
    await prisma.scanLog.create({
      data: {
        userId,
        drugName,
        genericName: result.genericName,
        riskCategory: result.riskCategory,
        comboRisk: result.comboAnalysis?.comboRiskLevel ?? null,
        scanType: 'TEXT',
        alternatives: result.comboAnalysis
          ? JSON.parse(JSON.stringify(result.comboAnalysis.alternatives))
          : undefined,
        fullResult: JSON.parse(JSON.stringify(result)),
      },
    })
  } catch (err) {
    console.error('[drug-scanner] Failed to save scan log:', err)
  }
}

/** Fetch current medications for a user. */
async function getUserMedications(userId: string): Promise<{
  genotype: string | null
  currentMeds: MedicationWithCyp[]
}> {
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      genotype: true,
      medications: {
        where: { active: true },
        select: {
          genericName: true,
          qtRisk: true,
          isDTA: true,
          cypData: true,
        },
      },
    },
  })

  const currentMeds: MedicationWithCyp[] = (userData?.medications ?? []).map(
    (m) => ({
      genericName: m.genericName,
      qtRisk: m.qtRisk as RiskCategory,
      isDTA: m.isDTA,
      cypData: m.cypData as CypData | null,
    }),
  )

  return { genotype: userData?.genotype ?? null, currentMeds }
}

// The resolver returns early on match, so later steps never emit.
// This ensures the full pipeline is always visible in the UI.

const EXPECTED_RESOLVER_STEPS = [
  'US Drug Safety Database',
  'Checking Similar Names',
  'Bulgarian Drug Database',
]

function backfillPipelineSteps(trace: PipelineStep[]): PipelineStep[] {
  const result: PipelineStep[] = []
  const resolverStepSet = new Set(EXPECTED_RESOLVER_STEPS)

  // Insert expected resolver steps in order, filling gaps with SKIPPED
  for (const name of EXPECTED_RESOLVER_STEPS) {
    const existing = trace.find((s) => s.name === name)
    result.push(existing ?? { name, status: 'SKIPPED', durationMs: 0, detail: 'Not needed — resolved earlier' })
  }

  // Append non-resolver steps in their original order (AI Safety Review, Drug Interaction Check, etc.)
  for (const step of trace) {
    if (!resolverStepSet.has(step.name)) {
      result.push(step)
    }
  }

  return result
}


/**
 * Scan a drug by text name. Orchestrates multi-source resolution + AI analysis.
 *
 * Flow:
 * 1. resolveDrug() — multi-step: local exact → fuzzy → RxNorm → CredibleMeds → AI
 * 2. If no local/API match → AI unknown drug assessment (enriched with external data)
 * 3. If risky + user has meds → AI combo analysis (works for BOTH known AND unknown drugs)
 * 4. Multi-source risk aggregation (highest risk from any source wins)
 * 5. Save to ScanLog
 * 6. Return ScanResult with enrichment data
 */
export async function scanDrugByText(
  drugName: string,
  userId: string,
  dosage?: string,
  onStep?: OnStepCallback,
): Promise<ScanResult> {
  const cached = getCachedResult(userId, drugName)
  if (cached) {
    const cachedResult = {
      ...cached,
      pipelineTrace: [
        { name: 'Quick Lookup', status: 'HIT' as const, durationMs: 0, detail: 'Recently scanned — returning saved result' },
        ...(cached.pipelineTrace ?? []),
      ],
    }
    return cachedResult
  }

  const resolved = await resolveDrug(drugName, onStep)
  const trace: PipelineStep[] = [...(resolved.pipelineTrace ?? [])]

  function emitStep(step: PipelineStep) {
    trace.push(step)
    onStep?.(step)
  }

  if (!resolved.localEntry && resolved.matchSource === 'AI_ONLY') {
    // Build enrichment data for the AI prompt
    const enrichment: EnrichmentData = {
      rxnormResolution: resolved.rxnormData,
      credibleMedsData: resolved.credibleMedsData,
      fdaSignal: resolved.fdaSignal,
    }

    // Use enriched prompt if we have any external data, otherwise standard
    const hasExternalData = resolved.rxnormData || resolved.credibleMedsData || resolved.fdaSignal
    const prompt = hasExternalData
      ? buildEnrichedUnknownDrugPrompt(drugName, enrichment)
      : buildUnknownDrugPrompt(drugName)

    const tAi = Date.now()
    const { object: aiResult } = await generateObject({
      model,
      schema: UnknownDrugSchema,
      prompt,
      temperature: 0,
    })
    emitStep({
      name: 'AI Safety Review',
      status: 'HIT',
      durationMs: Date.now() - tAi,
      detail: aiResult.isRealDrug
        ? `${aiResult.genericName ?? drugName}: ${aiResult.qtRiskAssessment}`
        : 'Not recognized as a medication',
    })

    const result = mapUnknownDrugToScanResult(drugName, aiResult, resolved)
    if (dosage) result.dosage = dosage

    // Run combo analysis when the AI assessment indicates the drug may be
    // risky and the user has other medications on file.
    if (
      aiResult.isRealDrug &&
      aiResult.qtRiskAssessment !== 'LIKELY_SAFE' &&
      aiResult.qtRiskAssessment !== 'NOT_A_DRUG'
    ) {
      try {
        const { genotype, currentMeds } = await getUserMedications(userId)

        const comboPrompt = buildComboPromptForUnknownDrug(
            drugName,
            {
              genericName: aiResult.genericName ?? drugName,
              drugClass: aiResult.drugClass ?? 'Unknown',
              primaryUse: aiResult.primaryUse ?? 'Unknown',
              qtRiskAssessment: aiResult.qtRiskAssessment,
              reasoning: aiResult.reasoning,
            },
            currentMeds,
            genotype,
            enrichment,
          )

          const tCombo = Date.now()
          const { object: comboAI } = await generateObject({
            model,
            schema: ComboAnalysisSchema,
            prompt: comboPrompt,
            temperature: 0,
          })
          emitStep({
            name: 'Drug Interaction Check',
            status: 'HIT',
            durationMs: Date.now() - tCombo,
            detail: currentMeds.length > 0
              ? `${comboAI.comboRisk.level} risk with ${currentMeds.length} current medication(s)`
              : `Safer alternatives found`,
          })

          result.comboAnalysis = mapComboAnalysis(comboAI)
      } catch (err) {
        console.error('[drug-scanner] Combo analysis for unknown drug failed:', err)
        emitStep({ name: 'Drug Interaction Check', status: 'ERROR', durationMs: 0, detail: 'Could not check interactions — showing available results' })
      }
    }

    result.pipelineTrace = backfillPipelineSteps(trace)
    setCachedResult(userId, drugName, result)
    await saveScanLog(userId, drugName, result)
    return result
  }

  const drugInfo = resolved.localEntry
  if (!drugInfo) {
    // Resolved via CredibleMeds API but not in local DB
    // Use CredibleMeds data to build a result, then optionally run combo analysis
    const credData = resolved.credibleMedsData
    if (credData) {
      const result: ScanResult = {
        drugName,
        genericName: credData.genericName,
        riskCategory: credData.riskCategory,
        isDTA: credData.isDTA,
        drugClass: credData.drugClass,
        primaryUse: 'See prescribing information',
        qtMechanism: 'Classified by CredibleMeds — consult your cardiologist for details',
        cyp: { metabolizedBy: [], inhibits: [], induces: [] },
        source: 'CREDIBLEMEDS_API',
        comboAnalysis: null,
        scannedAt: new Date().toISOString(),
        enrichment: resolved.enrichment,
        dosage: dosage ?? null,
        fuzzyMatch: resolved.fuzzyMatch,
      }

      // Run combo analysis if drug is risky and user has meds
      if (credData.riskCategory !== 'NOT_LISTED') {
        try {
          const { genotype, currentMeds } = await getUserMedications(userId)
          const comboPrompt = buildComboPromptForUnknownDrug(
              drugName,
              {
                genericName: credData.genericName,
                drugClass: credData.drugClass,
                primaryUse: 'See prescribing information',
                qtRiskAssessment: 'POSSIBLE_RISK',
                reasoning: `This drug is classified as ${credData.riskCategory} by CredibleMeds, the gold standard QT risk database.`,
              },
              currentMeds,
              genotype,
              {
                rxnormResolution: resolved.rxnormData,
                credibleMedsData: resolved.credibleMedsData,
                fdaSignal: resolved.fdaSignal,
              },
            )

            const tCombo2 = Date.now()
            const { object: comboAI } = await generateObject({
              model,
              schema: ComboAnalysisSchema,
              prompt: comboPrompt,
              temperature: 0,
            })
            emitStep({
              name: 'Drug Interaction Check',
              status: 'HIT',
              durationMs: Date.now() - tCombo2,
              detail: currentMeds.length > 0
                ? `${comboAI.comboRisk.level} risk with ${currentMeds.length} current medication(s)`
                : `Safer alternatives found`,
            })

            result.comboAnalysis = mapComboAnalysis(comboAI)
        } catch (err) {
          console.error('[drug-scanner] Combo analysis for CredibleMeds drug failed:', err)
          emitStep({ name: 'Drug Interaction Check', status: 'ERROR', durationMs: 0, detail: 'Could not check interactions' })
        }
      }

      result.pipelineTrace = backfillPipelineSteps(trace)
      await saveScanLog(userId, drugName, result)
      return result
    }

    // Should not reach here, but fallback to AI assessment
    const tFb = Date.now()
    const { object: aiResult } = await generateObject({
      model,
      schema: UnknownDrugSchema,
      prompt: buildUnknownDrugPrompt(drugName),
      temperature: 0,
    })
    emitStep({ name: 'AI Safety Review', status: 'HIT', durationMs: Date.now() - tFb, detail: 'AI assessed drug safety' })

    const result = mapUnknownDrugToScanResult(drugName, aiResult, resolved)
    result.pipelineTrace = backfillPipelineSteps(trace)
    setCachedResult(userId, drugName, result)
    await saveScanLog(userId, drugName, result)
    return result
  }

  const result = drugInfoToScanResult(drugName, drugInfo, resolved)
  if (dosage) result.dosage = dosage

  // If NOT_LISTED → instant green, no AI call needed
  if (result.riskCategory === 'NOT_LISTED') {
    emitStep({ name: 'Drug Interaction Check', status: 'SKIPPED', durationMs: 0, detail: 'Drug not in risk list — no interaction check needed' })
    result.pipelineTrace = backfillPipelineSteps(trace)
    setCachedResult(userId, drugName, result)
    await saveScanLog(userId, drugName, result)
    return result
  }

  // Risky drug — attempt combo analysis with patient's current medications
  try {
    const { genotype, currentMeds } = await getUserMedications(userId)

    const qtEntry = drugInfoToQtDrugEntry(drugInfo)

    // Use dosage-aware combo prompt if dosage is available
    const prompt = dosage
      ? buildComboPromptWithDosage(qtEntry, currentMeds, genotype, dosage)
      : buildComboPrompt(qtEntry, currentMeds, genotype)

    const tCombo3 = Date.now()
    const { object: comboAI } = await generateObject({
      model,
      schema: ComboAnalysisSchema,
      prompt,
      temperature: 0,
    })
    emitStep({
      name: 'Drug Interaction Check',
      status: 'HIT',
      durationMs: Date.now() - tCombo3,
      detail: currentMeds.length > 0
        ? `${comboAI.comboRisk.level} risk with ${currentMeds.length} current medication(s)`
        : `Safer alternatives found`,
    })

    result.comboAnalysis = mapComboAnalysis(comboAI)
  } catch (err) {
    console.error('[drug-scanner] Combo analysis failed, returning local result only:', err)
    emitStep({ name: 'Drug Interaction Check', status: 'ERROR', durationMs: 0, detail: 'Could not check interactions — showing available results' })
  }

  result.pipelineTrace = backfillPipelineSteps(trace)
  await saveScanLog(userId, drugName, result)

  // Notify watch if drug is risky (fire-and-forget, non-blocking)
  if (result.riskCategory === 'KNOWN_RISK' || result.riskCategory === 'POSSIBLE_RISK') {
    notifyWatchOfDrugRisk(userId, result.genericName, result.riskCategory).catch(() => {})
  }

  return result
}
