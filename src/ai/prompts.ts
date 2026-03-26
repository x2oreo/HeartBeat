import type { DrugInfo, Genotype, CypData } from '@/types'

// ── Combo Analysis Prompt ──────────────────────────────────────────

type MedicationForPrompt = {
  genericName: string
  riskCategory: string
  isDTA: boolean
  cyp: CypData
}

export function buildComboAnalysisPrompt(
  scannedDrug: DrugInfo,
  currentMedications: MedicationForPrompt[],
  genotype: Genotype | null,
) {
  const medsBlock = currentMedications
    .map(
      (m) =>
        `- ${m.genericName} (Risk: ${m.riskCategory}, DTA: ${m.isDTA}, Metabolized by: ${m.cyp.metabolizedBy.join(', ') || 'unknown'}, Inhibits: ${m.cyp.inhibits.join(', ') || 'none'}, Induces: ${m.cyp.induces.join(', ') || 'none'})`,
    )
    .join('\n')

  return `You are a clinical pharmacology AI assistant helping patients with Long QT Syndrome (LQTS) understand drug interaction risks. You MUST be conservative — when in doubt, flag the risk.

## Patient Profile
- Genotype: ${genotype ?? 'Unknown'}

## Drug Being Scanned
- Name: ${scannedDrug.genericName}
- QT Risk: ${scannedDrug.riskCategory}
- Torsades de Pointes Risk (DTA): ${scannedDrug.isDTA}
- Drug Class: ${scannedDrug.drugClass}
- QT Mechanism: ${scannedDrug.qtMechanism}
- CYP Metabolism: Metabolized by ${scannedDrug.cyp.metabolizedBy.join(', ') || 'unknown'}; Inhibits ${scannedDrug.cyp.inhibits.join(', ') || 'none'}; Induces ${scannedDrug.cyp.induces.join(', ') || 'none'}

## Patient's Current Medications
${medsBlock || 'None'}

## Task
1. Analyze the combination risk of the scanned drug with EACH current medication
2. Consider CYP450 enzyme interactions (inhibition = higher drug levels = more QT risk)
3. Consider additive QT prolongation when multiple QT-risk drugs are combined
4. Factor in genotype-specific risks if known
5. Suggest safer alternatives that treat the same condition but have lower QT risk
6. Write the summary in plain language a patient can understand — no medical jargon without explanation`
}

// ── Photo Scan Prompt ──────────────────────────────────────────────

export function buildPhotoScanPrompt() {
  return `You are reading a photo of a medication package, box, label, or pill bottle. Extract the drug name(s) visible in the image.

## Rules
1. Look for the generic name (active ingredient) — this is most important
2. Also note brand names if visible
3. Ignore dosage, manufacturer, and other text unless it helps identify the drug
4. If you can read the text clearly, confidence is HIGH
5. If partially obscured or blurry, confidence is MEDIUM
6. If you're guessing, confidence is LOW
7. Return the raw text you can read from the image`
}

// ── Emergency Card Prompt ──────────────────────────────────────────

export function buildEmergencyCardPrompt(
  patientName: string,
  genotype: Genotype | null,
  medications: { name: string; riskCategory: string; isDTA: boolean }[],
) {
  const medsBlock = medications
    .map((m) => `- ${m.name} (Risk: ${m.riskCategory}, DTA: ${m.isDTA})`)
    .join('\n')

  return `You are generating critical notes for an LQTS patient's emergency card. This card will be shown to ER doctors and paramedics.

## Patient
- Name: ${patientName}
- LQTS Genotype: ${genotype ?? 'Unknown'}

## Current Medications
${medsBlock || 'None listed'}

## Task
Generate up to 5 critical notes for emergency responders. These must be:
- Short (1 sentence each)
- Actionable for ER staff
- Focused on what NOT to give this patient and what to watch for
- Include genotype-specific guidance if genotype is known (e.g., LQT1 patients: avoid swimming triggers; LQT2: avoid sudden loud noises/alarms)
- Always include: "Do NOT administer QT-prolonging drugs without cardiology consult"`
}

// ── Doctor Prep Prompt ─────────────────────────────────────────────

export function buildDoctorPrepPrompt(
  patientName: string,
  genotype: Genotype | null,
  medications: { name: string; riskCategory: string; isDTA: boolean; cypProfile: CypData }[],
  procedureType: string | null,
) {
  const medsBlock = medications
    .map(
      (m) =>
        `- ${m.name} (Risk: ${m.riskCategory}, DTA: ${m.isDTA}, CYP: metabolized by ${m.cypProfile.metabolizedBy.join(', ') || 'unknown'})`,
    )
    .join('\n')

  return `You are preparing a drug safety brief for an LQTS patient's upcoming doctor visit.

## Patient
- Name: ${patientName}
- LQTS Genotype: ${genotype ?? 'Unknown'}
${procedureType ? `- Upcoming Procedure: ${procedureType}` : ''}

## Current Medications
${medsBlock || 'None listed'}

## Task
1. Write a drug safety brief summarizing QT risks in the patient's current medication profile
2. List specific medications to avoid (especially if a procedure is planned — many anesthetics and anti-nausea drugs prolong QT)
3. Suggest questions the patient should ask their doctor about medication safety
4. Suggest safer alternatives where applicable
5. Keep language professional but accessible`
}
