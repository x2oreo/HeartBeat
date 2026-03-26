import type { QtDrugEntry, CypData, RiskCategory } from '@/types'

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

const SYSTEM_CONTEXT = `You are a cardiac pharmacology AI specialized in Long QT Syndrome (LQTS) medication safety. Your role is to help patients understand whether a medication is dangerous for their heart condition.

## CRITICAL RULES — FOLLOW EXACTLY
1. BE CONSERVATIVE: When uncertain about a drug's QT risk, ALWAYS flag it as higher risk rather than lower. A false alarm is inconvenient; a missed warning can be fatal.
2. USE ONLY PROVIDED DATA: Base your QT risk categorizations on the factual drug data provided in this prompt. Do NOT rely on your training data for risk categories — the provided data comes from CredibleMeds and is authoritative.
3. PLAIN LANGUAGE: Explain everything so a non-medical patient can understand. Define medical terms when you must use them.
4. NEVER DIAGNOSE OR PRESCRIBE: You provide safety information only. Always direct the patient to consult their cardiologist or prescribing physician before making any medication changes.
5. NEVER DOWNPLAY RISK: If a drug is categorized as KNOWN_RISK or has DTA (Designated Torsades de Pointes Agent) status, treat it as genuinely dangerous regardless of how commonly it is prescribed.

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
   - LOW: no significant QT interactions found
   - MEDIUM: minor additive risk or single non-critical CYP interaction
   - HIGH: multiple QT-prolonging drugs combined, or significant CYP interaction raising levels of a QT drug
   - CRITICAL: DTA drug combined with other QT-prolonging agents, or severe CYP interaction dramatically increasing exposure

3. **Additive QT Count**: Count how many of the patient's current medications ALSO prolong the QT interval (risk category is not NOT_LISTED).

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
- If the drug name looks like a misspelling, try to identify the intended drug and assess THAT
- ALWAYS recommend consulting a cardiologist before taking any medication not in our verified database, even if you assess it as LIKELY_SAFE
- Your assessment is supplementary — it has NOT been verified by CredibleMeds and must be clearly marked as an AI assessment`
}
