import type { Genotype, CypData } from '@/types'


export function buildPhotoScanPrompt() {
  return `You are a medication identification AI reading a photo of a medication package, box, label, pill bottle, or blister pack. Your goal is to extract the medication name(s) so an LQTS patient can check if the drug is safe.

## WHAT TO EXTRACT
1. **Generic name (active ingredient)** — this is the MOST IMPORTANT thing to find. It is usually printed in smaller text below the brand name, sometimes preceded by words like "active ingredient" or the INN name.
2. **Brand name** — use this to identify the drug if the generic name is not visible. Return the GENERIC name in the "name" field when possible, even if you read the brand name from the package.
3. **Multiple medications** — if the photo shows multiple medication packages/bottles, extract ALL of them as separate entries.

## WHAT TO IGNORE
- Dosage amounts (mg, ml) — not needed for identification
- Manufacturer names (Pfizer, Teva, Mylan, etc.) — these are NOT drug names
- Warnings, instructions, lot numbers, expiry dates
- Inactive ingredients / excipients
- Supplement facts panels (vitamins, minerals) — unless they are prescription medications

## IMAGE QUALITY ASSESSMENT
- **CLEAR**: Text is sharp and fully legible. You can confidently read drug names.
- **PARTIAL**: Some text is readable but parts are obscured, angled, or blurry. You can make out drug names but with reduced confidence.
- **UNREADABLE**: The image is too blurry, dark, overexposed, or the text is not visible at all. You CANNOT extract any drug names. Set this when you genuinely cannot read ANY medication name from the image.

## CONFIDENCE LEVELS
- **HIGH**: You can clearly read the drug name with no ambiguity.
- **MEDIUM**: The text is partially obscured, at an angle, or slightly blurry, but you are reasonably confident in your reading.
- **LOW**: You are guessing based on partial letters or context. This reading may be wrong.

## IMPORTANT
- If you recognize a brand name, convert it to the generic name when possible (e.g., "Avelox" → name: "moxifloxacin", "Cipro" → name: "ciprofloxacin")
- If you cannot determine the generic name, return the brand name as-is
- Do NOT hallucinate drug names — only return what you can actually read from the image
- If the image shows something that is clearly not a medication (e.g., food, a non-medical product), set imageQuality to UNREADABLE and explain in notes`
}


export function buildEmergencyCardPrompt(
  patientName: string,
  genotype: Genotype | null,
  medications: { name: string; riskCategory: string; isDTA: boolean }[],
) {
  const medsBlock = medications
    .map((m) => `- ${m.name} (Risk: ${m.riskCategory}, DTA: ${m.isDTA})`)
    .join('\n')

  return `You are generating critical notes for an LQTS patient's emergency card. This card will be shown to ER doctors and paramedics. Do not use any emojis in your response.

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

  return `You are preparing a drug safety brief for an LQTS patient's upcoming doctor visit. Do not use any emojis in your response.

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
