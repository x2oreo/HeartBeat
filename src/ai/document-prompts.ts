import type { Genotype, CypData } from '@/types'

// ── Types for prompt inputs ──────────────────────────────────────

type MedicationInput = {
  name: string
  riskCategory: string
  isDTA: boolean
  cyp: CypData
}

type ContactInput = {
  name: string
  phone: string
  relationship: string
}

// ── Emergency Card Prompt ────────────────────────────────────────

export function buildEnhancedEmergencyCardPrompt(
  patientName: string,
  genotype: Genotype | null,
  medications: MedicationInput[],
  emergencyContacts: ContactInput[],
): string {
  const medsBlock = medications.length > 0
    ? medications
        .map(
          (m) =>
            `- ${m.name} (QT Risk: ${m.riskCategory}, TdP/DTA: ${m.isDTA}, Metabolized by: ${m.cyp.metabolizedBy.join(', ') || 'unknown'}, Inhibits: ${m.cyp.inhibits.join(', ') || 'none'}, Induces: ${m.cyp.induces.join(', ') || 'none'})`,
        )
        .join('\n')
    : 'None currently listed'

  const contactsBlock = emergencyContacts.length > 0
    ? emergencyContacts
        .map((c) => `- ${c.name} (${c.relationship}): ${c.phone}`)
        .join('\n')
    : 'None listed'

  return `You are generating an emergency medical card for a patient with Long QT Syndrome (LQTS). This card will be shown to ER doctors, paramedics, and emergency responders who may have ZERO prior knowledge of this patient.

The card must be readable in under 30 seconds during a medical emergency. Be terse, specific, and action-oriented. Use clinical language appropriate for ER staff.

## Patient Profile
- Name: ${patientName}
- LQTS Genotype: ${genotype ?? 'Unknown'}
${genotype === 'LQT1' ? '- LQT1 Note: Higher risk during exercise and swimming. Avoid adrenergic stimulation.' : ''}
${genotype === 'LQT2' ? '- LQT2 Note: Higher risk with sudden auditory stimuli (alarms, phones). Avoid hypokalemia.' : ''}
${genotype === 'LQT3' ? '- LQT3 Note: Higher risk at rest/during sleep. Sodium channel dysfunction.' : ''}

## Current Medications
${medsBlock}

## Emergency Contacts
${contactsBlock}

## Instructions
1. Write a short, urgent headline for the card header
2. Write ONE critical warning sentence that ER staff must read first
3. Categorize dangerous drugs to avoid by class (focus on drugs commonly given in ER: antibiotics, antiemetics, antiarrhythmics, sedatives, pain medications)
4. List medications that ARE safe to give in an emergency (e.g., safe antibiotics, safe pain relief, safe antiemetics for LQTS)
5. Write 4-6 emergency protocol steps (what to do, what to monitor, who to call)
6. For each of the patient's current medications, write a brief warning or note relevant to ER care

Be CONSERVATIVE. When in doubt about a drug's safety, list it as one to avoid.`
}

// ── Doctor Prep Prompt ───────────────────────────────────────────

export function buildEnhancedDoctorPrepPrompt(
  patientName: string,
  genotype: Genotype | null,
  medications: MedicationInput[],
  procedureType: string | null,
): string {
  const medsBlock = medications.length > 0
    ? medications
        .map(
          (m) =>
            `- ${m.name} (QT Risk: ${m.riskCategory}, TdP/DTA: ${m.isDTA}, CYP: metabolized by ${m.cyp.metabolizedBy.join(', ') || 'unknown'}, inhibits ${m.cyp.inhibits.join(', ') || 'none'})`,
        )
        .join('\n')
    : 'None currently listed'

  const procedureBlock = procedureType
    ? `\n## Upcoming Procedure\n- Type: ${procedureType}\n- Consider: anesthesia agents, antiemetics, sedatives, and local anesthetics commonly used in this procedure. Many of these prolong QT.`
    : ''

  return `You are preparing a drug safety brief for a physician treating a patient with Long QT Syndrome (LQTS). This document will be shared with the doctor before a medical visit or procedure.

Write at a level appropriate for a physician. Be specific about drug names and mechanisms.

## Patient Profile
- Name: ${patientName}
- LQTS Genotype: ${genotype ?? 'Unknown'}
${genotype === 'LQT1' ? '- LQT1: IKs channel dysfunction. Exercise and swimming are primary triggers.' : ''}
${genotype === 'LQT2' ? '- LQT2: IKr (hERG) channel dysfunction. Most drug-induced QT prolongation affects this channel.' : ''}
${genotype === 'LQT3' ? '- LQT3: SCN5A sodium channel dysfunction. Events occur at rest. Mexiletine may be therapeutic.' : ''}
${procedureBlock}

## Current Medications
${medsBlock}

## Instructions
1. Write a drug safety brief summarizing the QT risk profile of the patient's current medications and any CYP450 interaction concerns
2. List specific medications to avoid${procedureType ? ` — focus on drugs commonly used during/around ${procedureType} (anesthetics, antiemetics, sedatives, antibiotics)` : ''}
3. Suggest 4-8 questions the patient should ask their doctor about medication safety
4. Suggest safer alternatives where QT-prolonging drugs might otherwise be prescribed
5. ${procedureType ? `List procedure-specific warnings for ${procedureType} in an LQTS patient` : 'Return an empty array for procedureSpecificWarnings since no procedure is specified'}

Be CONSERVATIVE. Prioritize patient safety over convenience.`
}
