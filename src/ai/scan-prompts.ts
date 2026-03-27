import type { QtDrugEntry, CypData, RiskCategory } from '@/types'
import type { CredibleMedsResult } from '@/services/external/crediblemeds-client'
import type { OpenFDASignal } from '@/services/external/openfda-client'
import type { RxNormResult } from '@/services/external/rxnorm-client'

// ── Types ────────────────────────────────────────────────────────────

/** Shape of a medication record with CYP data, as loaded from Prisma for combo analysis. */
export type MedicationWithCyp = {
  genericName: string
  qtRisk: RiskCategory
  isDTA: boolean
  cypData: CypData | null
}

// ── System Context ───────────────────────────────────────────────────
// Shared medical context injected into all scan-related AI calls.

export const SYSTEM_CONTEXT = `You are a cardiac pharmacology AI specialized in Long QT Syndrome (LQTS) medication safety. Your role is to help patients understand whether a medication is dangerous for their heart condition.

## CRITICAL RULES — FOLLOW EXACTLY
1. BE CONSERVATIVE: When uncertain about a drug's QT risk, ALWAYS flag it as higher risk rather than lower. A false alarm is inconvenient; a missed warning can be fatal.
2. USE ONLY PROVIDED DATA: Base your QT risk categorizations on the factual drug data provided in this prompt. Do NOT rely on your training data for risk categories — the provided data comes from CredibleMeds and is authoritative.
3. PLAIN LANGUAGE: Explain everything so a non-medical patient can understand. Define medical terms when you must use them.
4. NEVER DIAGNOSE OR PRESCRIBE: You provide safety information only. Always direct the patient to consult their cardiologist or prescribing physician before making any medication changes.
5. NEVER DOWNPLAY RISK: If a drug is categorized as KNOWN_RISK or has DTA (Designated Torsades de Pointes Agent) status, treat it as genuinely dangerous regardless of how commonly it is prescribed.
6. NO EMOJIS: Do not use any emojis anywhere in your response.

## MEDICAL CONTEXT — LQTS PHARMACOLOGY
- QTc interval >500ms is HIGH RISK for cardiac arrhythmia (Torsades de Pointes)
- Additive QT prolongation is MORE than additive — combining two QT-prolonging drugs creates multiplicative risk, not just additive
- CYP450 enzyme inhibition increases plasma levels of the affected drug, amplifying its QT-prolonging effect (e.g., if Drug A inhibits CYP3A4 and Drug B is metabolized by CYP3A4, Drug B's levels rise dangerously)
- CYP450 enzyme induction decreases plasma levels, potentially reducing efficacy but generally lowering QT risk
- Electrolyte depletion (hypokalemia, hypomagnesemia) compounds QT prolongation risk — drugs causing this are additional red flags
- Genotype-specific triggers:
  - LQT1: exercise and swimming are high-risk triggers — adrenergic stimulation is dangerous
  - LQT2: auditory stimuli (alarms, sudden loud sounds) and emotional stress are triggers — drugs affecting potassium channels (IKr/hERG) are especially dangerous
  - LQT3: risk is highest during sleep and rest — sodium channel–blocking drugs require extra caution`

// ── Combo Analysis Prompt ────────────────────────────────────────────

function formatCypProfile(cyp: CypData | null): string {
  if (!cyp) return 'CYP data: unknown'
  const parts: string[] = []
  parts.push(`Metabolized by: ${cyp.metabolizedBy.length > 0 ? cyp.metabolizedBy.join(', ') : 'unknown'}`)
  parts.push(`Inhibits: ${cyp.inhibits.length > 0 ? cyp.inhibits.join(', ') : 'none'}`)
  parts.push(`Induces: ${cyp.induces.length > 0 ? cyp.induces.join(', ') : 'none'}`)
  return parts.join(' | ')
}

export function buildComboPrompt(
  newDrug: QtDrugEntry,
  currentMeds: MedicationWithCyp[],
  genotype: string | null,
): string {
  const currentMedsBlock = currentMeds.length > 0
    ? currentMeds.map((m, i) =>
        `${i + 1}. ${m.genericName}\n   - QT Risk: ${m.qtRisk}\n   - DTA: ${m.isDTA ? 'YES' : 'no'}\n   - ${formatCypProfile(m.cypData)}`
      ).join('\n')
    : 'Patient is not currently taking any other medications.'

  return `${SYSTEM_CONTEXT}

---

## PATIENT PROFILE
- LQTS Genotype: ${genotype ?? 'Unknown (assume worst-case for all genotype-specific risks)'}

## PATIENT'S CURRENT MEDICATIONS
${currentMedsBlock}

## NEW DRUG BEING SCANNED
- Generic Name: ${newDrug.genericName}
- QT Risk Category: ${newDrug.riskCategory}
- Designated Torsades Agent (DTA): ${newDrug.isDTA ? 'YES — this drug has direct evidence of causing Torsades de Pointes' : 'No'}
- Drug Class: ${newDrug.drugClass}
- Primary Use: ${newDrug.primaryUse}
- QT Mechanism: ${newDrug.qtMechanism}
- ${formatCypProfile(newDrug.cyp)}

## YOUR TASK
Analyze the COMBINATION RISK of this new drug with the patient's current medications. Specifically:

1. **Pairwise Interactions**: For EACH current medication, determine if there is:
   - ADDITIVE_QT risk: both drugs prolong QT, compounding the danger
   - CYP_INHIBITION: one drug inhibits the CYP enzyme that metabolizes the other, raising plasma levels and amplifying QT effect
   - CYP_INDUCTION: one drug induces metabolism of the other, potentially reducing its efficacy
   - OTHER: any other pharmacological interaction relevant to QT safety

2. **Overall Combo Risk Level**: Considering ALL interactions together, assign an overall risk:
   - LOW: no significant QT interactions found (the new drug has QT risk but no current meds prolong QT or interfere via CYP)
   - MEDIUM: minor additive risk (one current med has POSSIBLE_RISK or CONDITIONAL_RISK for QT) or a single non-critical CYP interaction
   - HIGH: multiple QT-prolonging drugs combined, or a significant CYP interaction that raises plasma levels of a QT-prolonging drug
   - CRITICAL: use this when ANY of these conditions apply:
     * A DTA (Designated Torsades Agent) drug is combined with ANY other QT-prolonging medication
     * A CYP inhibitor dramatically increases exposure to a QT-prolonging drug (e.g., a CYP3A4 inhibitor combined with a drug metabolized by CYP3A4 that also prolongs QT)
     * 3 or more QT-prolonging drugs are being combined
     * Both additive QT prolongation AND CYP-mediated increased exposure occur simultaneously

3. **Additive QT Count**: Count how many of the patient's current medications ALSO prolong the QT interval. A medication prolongs QT if its QT Risk is KNOWN_RISK, POSSIBLE_RISK, or CONDITIONAL_RISK. Do NOT count medications with risk NOT_LISTED. This count does NOT include the new drug being scanned — only count current medications.

4. **Genotype Considerations**: If the patient's genotype is known, explain how it affects the risk of this specific combination. If unknown, return null.

5. **Safer Alternatives**: Suggest 2-3 alternative medications that:
   - Treat the SAME condition as the new drug (${newDrug.primaryUse})
   - Have lower or no QT prolongation risk
   - Do not have CYP conflicts with the patient's current medications
   - Include the drug class and a brief explanation of why each is safer
   - Note any caveats (e.g., "may be less effective for severe infections")

Write the explanation in plain language a patient can understand. Be thorough but not alarmist — state the facts clearly.`
}

// ── Unknown Drug Prompt ──────────────────────────────────────────────

export function buildUnknownDrugPrompt(drugName: string): string {
  return `${SYSTEM_CONTEXT}

---

## TASK
A patient with Long QT Syndrome has scanned a medication called "${drugName}" which was NOT found in our verified QT drug database (CredibleMeds).

Analyze this drug name and provide:

1. **Is this a real medication?** Determine if "${drugName}" is a legitimate medication name, a misspelling of one, or not a medication at all (e.g., a supplement, food, or gibberish).

2. **If it IS a real drug:**
   - Provide the correct generic/INN name
   - Identify its drug class
   - State what it is commonly prescribed for
   - Assess its QT prolongation risk:
     - LIKELY_SAFE: No known QT-prolonging effect in medical literature
     - POSSIBLE_RISK: Some evidence or case reports of QT prolongation
     - UNKNOWN: Insufficient data to make a determination

3. **If it is NOT a real drug:**
   - Set qtRiskAssessment to NOT_A_DRUG
   - Explain what the input appears to be

## CRITICAL RULES FOR THIS ASSESSMENT
- Since this drug is NOT in our verified database, you MUST use your medical knowledge to assess QT risk. This is the exception to the "use only provided data" rule — we have no provided data for this drug.
- If you are UNSURE whether a drug prolongs QT, classify it as POSSIBLE_RISK, not LIKELY_SAFE
- If the drug name looks like a misspelling, try to identify the intended drug and assess THAT. Set genericName to the correct spelling.
- ALWAYS recommend consulting a cardiologist before taking any medication not in our verified database, even if you assess it as LIKELY_SAFE
- Your assessment is supplementary — it has NOT been verified by CredibleMeds and must be clearly marked as an AI assessment

## IDENTIFYING NON-DRUGS
Set isRealDrug to false and qtRiskAssessment to NOT_A_DRUG when:
- The input is random characters or gibberish (e.g., "asdfgh", "xyz123")
- The input is a food, supplement brand, or non-pharmaceutical product
- The input is a medical condition or symptom, not a medication
- You cannot identify ANY real medication that matches or closely resembles the input

When qtRiskAssessment is NOT_A_DRUG:
- Set reasoning to explain what the input appears to be (or that it's unrecognizable)
- Set recommendation to "This does not appear to be a medication name. Please check the spelling and try again, or type the generic name of the medication."
- Leave genericName, drugClass, and primaryUse unset`
}

// ── Enriched Unknown Drug Prompt ─────────────────────────────────────
// Injects external API data so Claude reasons with facts, not just parametric knowledge.

export type EnrichmentData = {
  rxnormResolution: RxNormResult | null
  credibleMedsData: CredibleMedsResult | null
  fdaSignal: OpenFDASignal | null
}

export function buildEnrichedUnknownDrugPrompt(
  drugName: string,
  enrichment: EnrichmentData,
): string {
  const externalDataBlock = buildExternalDataBlock(enrichment)

  return `${SYSTEM_CONTEXT}

---

${externalDataBlock}

## TASK
A patient with Long QT Syndrome has scanned a medication called "${drugName}" which was NOT found in our local verified QT drug database.

${enrichment.credibleMedsData ? `IMPORTANT: The CredibleMeds database (the gold standard for QT risk) has classified this drug. Use their classification as authoritative.` : ''}
${enrichment.fdaSignal && enrichment.fdaSignal.torsadesReportCount > 0 ? `IMPORTANT: The FDA FAERS database shows ${enrichment.fdaSignal.torsadesReportCount} adverse event reports of Torsades de Pointes for this drug. This is real-world evidence of QT danger.` : ''}

Analyze this drug name and provide:

1. **Is this a real medication?** Determine if "${drugName}" is a legitimate medication name, a misspelling of one, or not a medication at all.

2. **If it IS a real drug:**
   - Provide the correct generic/INN name
   - Identify its drug class
   - State what it is commonly prescribed for
   - Assess its QT prolongation risk using the external data above AND your medical knowledge:
     - LIKELY_SAFE: No known QT-prolonging effect AND no adverse event signals
     - POSSIBLE_RISK: Some evidence of QT prolongation (CredibleMeds listing, FDA reports, or medical literature)
     - UNKNOWN: Insufficient data to make a determination

3. **If it is NOT a real drug:**
   - Set qtRiskAssessment to NOT_A_DRUG
   - Explain what the input appears to be

## CRITICAL RULES FOR THIS ASSESSMENT
- If CredibleMeds data is provided above, use their risk category as the primary basis for your assessment
- If FDA FAERS data shows torsades reports, this is strong evidence of QT risk — do not classify as LIKELY_SAFE
- If you are UNSURE whether a drug prolongs QT, classify it as POSSIBLE_RISK, not LIKELY_SAFE
- ALWAYS recommend consulting a cardiologist
- Your assessment must be clearly marked as requiring medical verification

## IDENTIFYING NON-DRUGS
Set isRealDrug to false and qtRiskAssessment to NOT_A_DRUG when:
- The input is random characters or gibberish
- The input is a food, supplement brand, or non-pharmaceutical product
- The input is a medical condition or symptom, not a medication
- You cannot identify ANY real medication that matches or closely resembles the input

When qtRiskAssessment is NOT_A_DRUG:
- Set reasoning to explain what the input appears to be
- Set recommendation to "This does not appear to be a medication name. Please check the spelling and try again, or type the generic name of the medication."
- Leave genericName, drugClass, and primaryUse unset`
}

// ── Combo Prompt for Unknown/AI-Assessed Drugs ──────────────────────
// Handles the gap where an AI-assessed drug needs combo analysis against
// the user's current medications.

export function buildComboPromptForUnknownDrug(
  drugName: string,
  aiAssessment: {
    genericName: string
    drugClass: string
    primaryUse: string
    qtRiskAssessment: string
    reasoning: string
  },
  currentMeds: MedicationWithCyp[],
  genotype: string | null,
  enrichment: EnrichmentData | null,
): string {
  const currentMedsBlock = currentMeds.length > 0
    ? currentMeds.map((m, i) =>
        `${i + 1}. ${m.genericName}\n   - QT Risk: ${m.qtRisk}\n   - DTA: ${m.isDTA ? 'YES' : 'no'}\n   - ${formatCypProfile(m.cypData)}`
      ).join('\n')
    : 'Patient is not currently taking any other medications.'

  const externalDataBlock = enrichment ? buildExternalDataBlock(enrichment) : ''

  return `${SYSTEM_CONTEXT}

---

## PATIENT PROFILE
- LQTS Genotype: ${genotype ?? 'Unknown (assume worst-case for all genotype-specific risks)'}

## PATIENT'S CURRENT MEDICATIONS
${currentMedsBlock}

## NEW DRUG BEING SCANNED (AI-ASSESSED — NOT IN VERIFIED DATABASE)
- Drug Name: ${drugName}
- Resolved Generic Name: ${aiAssessment.genericName}
- Drug Class: ${aiAssessment.drugClass}
- Primary Use: ${aiAssessment.primaryUse}
- AI QT Risk Assessment: ${aiAssessment.qtRiskAssessment}
- AI Reasoning: ${aiAssessment.reasoning}
- CYP data: unknown (not in our curated database — use your medical knowledge for CYP450 metabolism)

NOTE: This drug is NOT in our verified database. The information above is from AI assessment. Be EXTRA conservative in your risk evaluation. When in doubt, assume the drug has moderate QT risk and potential CYP interactions.

${externalDataBlock}

## YOUR TASK
Analyze the COMBINATION RISK of this new drug with the patient's current medications. Specifically:

1. **Pairwise Interactions**: For EACH current medication, determine if there is:
   - ADDITIVE_QT risk: both drugs may prolong QT
   - CYP_INHIBITION: one drug inhibits metabolism of the other
   - CYP_INDUCTION: one drug induces metabolism of the other
   - OTHER: any other pharmacological interaction relevant to QT safety

2. **Overall Combo Risk Level**: LOW / MEDIUM / HIGH / CRITICAL
   - Be conservative: since this drug is not verified, lean toward higher risk when uncertain
   - Apply the same CRITICAL criteria as for verified drugs

3. **Additive QT Count**: Count current medications that prolong QT (KNOWN_RISK, POSSIBLE_RISK, or CONDITIONAL_RISK).

4. **Genotype Considerations**: If genotype is known, explain relevance.

5. **Safer Alternatives**: Suggest 2-3 alternatives for ${aiAssessment.primaryUse} that have lower QT risk.

Write in plain language for a patient. Be thorough but not alarmist.`
}

// ── Dosage-Aware Combo Prompt Extension ─────────────────────────────

export function buildComboPromptWithDosage(
  newDrug: QtDrugEntry,
  currentMeds: MedicationWithCyp[],
  genotype: string | null,
  dosage: string,
): string {
  const basePrompt = buildComboPrompt(newDrug, currentMeds, genotype)

  return `${basePrompt}

## DOSAGE INFORMATION
- Scanned dosage: ${dosage}
- NOTE: Many QT-prolonging drugs have DOSE-DEPENDENT risk. Higher doses typically cause greater QT prolongation.
- For this drug (${newDrug.genericName}): consider whether the scanned dosage represents a standard, high, or maximum dose, and factor this into your risk assessment.
- Examples of dose-dependent QT risk: citalopram (FDA max 40mg for QT), ondansetron (high IV doses banned), escitalopram (>20mg increases QT risk significantly).`
}

// ── External Data Block Builder ─────────────────────────────────────

function buildExternalDataBlock(enrichment: EnrichmentData): string {
  const sections: string[] = []

  sections.push('## EXTERNAL DATA SOURCES (use these FACTS to inform your analysis)')

  if (enrichment.rxnormResolution) {
    sections.push(`- **RxNorm (NIH)**: Drug name resolved to "${enrichment.rxnormResolution.genericName}" (RxCUI: ${enrichment.rxnormResolution.rxcui}, match confidence: ${enrichment.rxnormResolution.score}%)`)
  }

  if (enrichment.credibleMedsData) {
    sections.push(`- **CredibleMeds (Gold Standard)**: ${enrichment.credibleMedsData.genericName} — Risk Category: ${enrichment.credibleMedsData.riskCategory}, DTA: ${enrichment.credibleMedsData.isDTA ? 'YES' : 'No'}, Drug Class: ${enrichment.credibleMedsData.drugClass}`)
  }

  if (enrichment.fdaSignal) {
    sections.push(`- **FDA FAERS Database**: ${enrichment.fdaSignal.torsadesReportCount} adverse event reports of Torsades de Pointes — Signal Strength: ${enrichment.fdaSignal.signalStrength}`)
  }

  if (sections.length === 1) {
    sections.push('- No external data available for this drug. Rely on your medical knowledge with extra caution.')
  }

  return sections.join('\n')
}
