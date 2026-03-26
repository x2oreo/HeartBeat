import { generateObject } from 'ai'
import { model } from '@/ai/client'
import { ComboAnalysisSchema, UnknownDrugSchema } from '@/ai/scan-schemas'
import type { ComboAnalysis, UnknownDrug } from '@/ai/scan-schemas'
import { buildComboPrompt, buildUnknownDrugPrompt } from '@/ai/scan-prompts'
import type { MedicationWithCyp } from '@/ai/scan-prompts'
import { lookupDrug } from '@/services/drug-lookup'
import { prisma } from '@/lib/prisma'
import type {
  ScanResult,
  ComboAnalysisResult,
  DrugInfo,
  QtDrugEntry,
  RiskCategory,
  CypData,
  ComboRiskLevel,
} from '@/types'

// ── Private Helpers ─────────────────────────────────────────────────

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

/** Build a ScanResult from an AI unknown drug assessment. */
function mapUnknownDrugToScanResult(
  drugName: string,
  ai: UnknownDrug,
): ScanResult {
  return {
    drugName,
    genericName: ai.genericName ?? drugName,
    riskCategory: mapQtRiskToCategory(ai.qtRiskAssessment),
    isDTA: false,
    drugClass: ai.drugClass ?? 'Unknown',
    primaryUse: ai.primaryUse ?? 'Unknown',
    qtMechanism: ai.recommendation
      ? `${ai.reasoning}\n\n${ai.recommendation}`
      : ai.reasoning,
    cyp: { metabolizedBy: [], inhibits: [], induces: [] },
    source: 'AI_ASSESSED',
    comboAnalysis: null,
    scannedAt: new Date().toISOString(),
  }
}

/** Build a base ScanResult from a verified DrugInfo lookup. */
function drugInfoToScanResult(
  drugName: string,
  info: DrugInfo,
): ScanResult {
  return {
    drugName,
    genericName: info.genericName,
    riskCategory: info.riskCategory,
    isDTA: info.isDTA,
    drugClass: info.drugClass,
    primaryUse: info.primaryUse,
    qtMechanism: info.qtMechanism,
    cyp: info.cyp,
    source: info.source,
    comboAnalysis: null,
    scannedAt: new Date().toISOString(),
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

// ── Main Export ──────────────────────────────────────────────────────

/**
 * Scan a drug by text name. Orchestrates local lookup + AI analysis.
 *
 * Flow:
 * 1. lookupDrug() — instant local JSON search
 * 2. If not found → AI unknown drug assessment
 * 3. If found + risky + user has meds → AI combo analysis
 * 4. Save to ScanLog
 * 5. Return ScanResult
 */
export async function scanDrugByText(
  drugName: string,
  userId: string,
): Promise<ScanResult> {
  const drugInfo = lookupDrug(drugName)

  // ── Unknown drug path ───────────────────────────────────────────
  if (!drugInfo) {
    const { object: aiResult } = await generateObject({
      model,
      schema: UnknownDrugSchema,
      prompt: buildUnknownDrugPrompt(drugName),
      temperature: 0,
    })

    const result = mapUnknownDrugToScanResult(drugName, aiResult)
    await saveScanLog(userId, drugName, result)
    return result
  }

  // ── Known drug path ─────────────────────────────────────────────
  const result = drugInfoToScanResult(drugName, drugInfo)

  // If NOT_LISTED → instant green, no AI call needed
  if (drugInfo.riskCategory === 'NOT_LISTED') {
    await saveScanLog(userId, drugName, result)
    return result
  }

  // Risky drug — attempt combo analysis with patient's current medications
  try {
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

    if (currentMeds.length > 0) {
      const qtEntry = drugInfoToQtDrugEntry(drugInfo)
      const prompt = buildComboPrompt(
        qtEntry,
        currentMeds,
        userData?.genotype ?? null,
      )

      const { object: comboAI } = await generateObject({
        model,
        schema: ComboAnalysisSchema,
        prompt,
        temperature: 0,
      })

      result.comboAnalysis = mapComboAnalysis(comboAI)
    }
  } catch (err) {
    console.error('[drug-scanner] Combo analysis failed, returning local result only:', err)
    // comboAnalysis stays null — local lookup result is still valid
  }

  await saveScanLog(userId, drugName, result)
  return result
}
