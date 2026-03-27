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
${genotype === 'OTHER' || genotype === 'UNKNOWN' || genotype === null ? '- Genotype unknown. Assume sensitivity to ALL QT-prolonging drugs. Apply maximum caution.' : ''}

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

const SPECIALTY_CONTEXT: Record<string, string> = {
  Cardiologist: 'Focus on QT interval monitoring, beta-blocker management, antiarrhythmic considerations, and ICD/pacemaker implications if relevant.',
  Dentist: 'Focus on local anesthetics (lidocaine with/without epinephrine), sedation agents, antibiotics commonly prescribed post-dental work, and anxiety management.',
  'General Practitioner': 'Cover broad medication safety: common prescriptions for infections, pain, allergies, and mental health that may prolong QT.',
  Surgeon: 'Focus on anesthesia agents (volatile and IV), antiemetics (ondansetron is KNOWN_RISK), muscle relaxants, perioperative antibiotics, and postoperative pain management.',
  Anesthesiologist: 'Critical focus on volatile anesthetics (sevoflurane, desflurane), IV induction agents, neuromuscular blockers, antiemetics (avoid ondansetron/droperidol), and perioperative electrolyte management.',
  Psychiatrist: 'Focus on psychotropic medications: many antipsychotics (haloperidol, quetiapine), SSRIs/SNRIs (escitalopram, citalopram), and TCAs prolong QT. Discuss safer alternatives for each class.',
  ENT: 'Focus on local anesthetics for procedures, commonly prescribed antibiotics (avoid fluoroquinolones, macrolides), antihistamines, and decongestants.',
  Gastroenterologist: 'Focus on antiemetics (ondansetron risk), proton pump inhibitors, motility agents (domperidone, metoclopramide risk), and sedation for endoscopy.',
  Dermatologist: 'Focus on antifungals (fluconazole, ketoconazole are QT risks), antibiotics for skin infections (avoid fluoroquinolones), and antihistamines.',
  Ophthalmologist: 'Focus on topical and systemic medications used in eye care. Most ophthalmic drops are low risk, but systemic absorption can occur. Note any oral antibiotics or antifungals.',
}

export function buildEnhancedDoctorPrepPrompt(
  patientName: string,
  genotype: Genotype | null,
  medications: MedicationInput[],
  doctorSpecialty: string,
  language: string,
  prohibitedDrugsSummary: string,
): string {
  const medsBlock = medications.length > 0
    ? medications
        .map(
          (m) =>
            `- ${m.name} (QT Risk: ${m.riskCategory}, TdP/DTA: ${m.isDTA}, CYP: metabolized by ${m.cyp.metabolizedBy.join(', ') || 'unknown'}, inhibits ${m.cyp.inhibits.join(', ') || 'none'})`,
        )
        .join('\n')
    : 'None currently listed'

  const specialtyGuide = SPECIALTY_CONTEXT[doctorSpecialty] ?? `This is a visit to a ${doctorSpecialty}. Focus on medications commonly used in this specialty that may prolong QT.`

  const languageInstruction = language !== 'English'
    ? `\n## LANGUAGE REQUIREMENT\nWrite ALL medical content in **${language}**. Use clinical terminology appropriate for ${language}-speaking physicians. Keep drug generic names in their international (English) form — do NOT translate drug names. Only the explanatory text, warnings, and questions should be in ${language}.`
    : ''

  return `You are preparing a drug safety brief for a **${doctorSpecialty}** treating a patient with Long QT Syndrome (LQTS). This document will be shared with the doctor before a medical visit.

Write at a level appropriate for a physician. Be specific about drug names and mechanisms.
${languageInstruction}

## Patient Profile
- Name: ${patientName}
- LQTS Genotype: ${genotype ?? 'Unknown'}
${genotype === 'LQT1' ? '- LQT1: IKs (KCNQ1) channel dysfunction. Exercise and swimming are primary triggers. Adrenergic stimulation increases risk.' : ''}
${genotype === 'LQT2' ? '- LQT2: IKr (hERG/KCNH2) channel dysfunction. Most drug-induced QT prolongation affects this channel. Sudden auditory stimuli and hypokalemia are triggers.' : ''}
${genotype === 'LQT3' ? '- LQT3: SCN5A sodium channel dysfunction. Events typically occur at rest/sleep. Mexiletine may be therapeutic. Bradycardia worsens risk.' : ''}
${genotype === 'OTHER' || genotype === 'UNKNOWN' || genotype === null ? '- Genotype not confirmed. Treat as potentially sensitive to ALL QT-prolonging drugs. Standard LQTS precautions apply across all ion channel mechanisms. Exercise extra caution with any drug known to prolong QT.' : ''}

## Doctor Specialty Context
${specialtyGuide}

## Current Medications
${medsBlock}

## Known Prohibited Drugs for LQTS Patients
The following drugs are verified QT-prolonging agents that this patient must avoid:
${prohibitedDrugsSummary}

## Instructions
1. Write a **summary**: 2-3 sentences in plain language summarizing the most critical safety points in this document. Mention the patient's condition, their key medication risks, and what the doctor absolutely must know. This will be shown as a preview on the patient's dashboard.
2. Write a **syndromeExplanation**: 2-3 sentences explaining this patient's specific LQT syndrome type in clinical terms that a ${doctorSpecialty} can quickly understand. Include the affected ion channel, mechanism, and key clinical implications.
3. Write a **drugSafetyBrief** summarizing the QT risk profile of the patient's current medications and any CYP450 interaction concerns relevant to a ${doctorSpecialty}.
4. For each current medication, write a **medicationImplication** explaining what it means for treatment by this ${doctorSpecialty}.
5. List **medicationsToAvoid** — focus specifically on drugs a ${doctorSpecialty} might commonly prescribe or use. For each, include the drug class and reason.
6. Suggest **saferAlternatives** where QT-prolonging drugs might otherwise be prescribed by this specialty. For each, include genericName, drugClass, and whySafer (brief explanation of why this is safer).
7. Suggest 4-8 **questionsForDoctor** the patient should ask about medication safety during this visit.
8. List **specialtyWarnings** — specific warnings for a ${doctorSpecialty} treating an LQTS patient.

Be CONSERVATIVE. Prioritize patient safety over convenience.`
}
