import { z } from 'zod'

// ── Shared primitive schemas (reused in service for safe DB parsing) ─

export const riskCategorySchema = z.enum(['KNOWN_RISK', 'POSSIBLE_RISK', 'CONDITIONAL_RISK', 'NOT_LISTED'])
export const genotypeSchema = z.enum(['LQT1', 'LQT2', 'LQT3', 'OTHER', 'UNKNOWN']).nullable()
export const cypDataSchema = z.object({
  metabolizedBy: z.array(z.string()),
  inhibits: z.array(z.string()),
  induces: z.array(z.string()),
})

// ── Emergency Card AI Schema ─────────────────────────────────────

export const emergencyCardAISchema = z.object({
  headline: z
    .string()
    .describe('Short headline for the card, e.g. "LONG QT SYNDROME — MEDICAL ALERT"'),
  criticalWarning: z
    .string()
    .describe('Single bold top-level warning for ER staff, 1-2 sentences max'),
  drugsToAvoidByCategory: z
    .array(
      z.object({
        category: z.string().describe('Drug class name, e.g. "Fluoroquinolone Antibiotics"'),
        drugs: z.array(z.string()).describe('Specific drug names in this category to avoid'),
      }),
    )
    .describe('Dangerous drugs grouped by class — focus on drugs commonly given in ER/hospital'),
  safeERMedications: z
    .array(
      z.object({
        name: z.string().describe('Generic drug name'),
        notes: z.string().describe('Brief note on safe usage for this patient'),
      }),
    )
    .describe('Medications that are safe to administer in an emergency setting for LQTS patients'),
  emergencyProtocolSteps: z
    .array(z.string())
    .describe('Ordered steps for ER staff to follow, max 6 steps, action-oriented'),
  currentMedicationNotes: z
    .array(
      z.object({
        name: z.string().describe('Medication the patient currently takes'),
        warning: z.string().describe('Relevant warning or interaction note for ER staff'),
      }),
    )
    .describe('Per-drug notes about the patient\'s current medications for ER awareness'),
})

export type EmergencyCardAIOutput = z.infer<typeof emergencyCardAISchema>

// ── Full enhanced card schema (used to validate DB reads/writes) ──

export const enhancedEmergencyCardDataSchema = z.object({
  patientName: z.string(),
  genotype: genotypeSchema,
  medications: z.array(z.object({
    name: z.string(),
    riskCategory: riskCategorySchema,
    isDTA: z.boolean(),
    dosage: z.string().optional(),
    brandName: z.string().optional(),
  })),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  })),
  criticalNotes: z.array(z.string()),
  generatedAt: z.string(),
  shareSlug: z.string(),
  aiContent: emergencyCardAISchema.optional(),
  patientPhoto: z.string().optional(),
  personalNotes: z.object({
    en: z.string(),
    bg: z.string(),
  }).optional(),
})

// ── Doctor Prep AI Schema ────────────────────────────────────────

export const doctorPrepAISchema = z.object({
  summary: z
    .string()
    .describe('A 2-3 sentence plain-language summary of the most important safety points in this document. Should mention the patient\'s condition, key medication risks, and the most critical thing the doctor needs to know. Written so a patient can glance at it and remember what this document covers.'),
  syndromeExplanation: z
    .string()
    .describe('2-3 sentence medical explanation of the patient\'s specific LQT syndrome type, written for a physician who may not specialize in cardiac electrophysiology'),
  drugSafetyBrief: z
    .string()
    .describe('Summary of current medication QT risks and CYP450 interaction concerns, written for a physician audience'),
  medicationImplications: z
    .array(
      z.object({
        name: z.string().describe('Name of the current medication'),
        implication: z.string().describe('What this medication implies for treatment — risk level, interactions, monitoring needs'),
      }),
    )
    .describe('Per-medication risk explanation for each of the patient\'s current medications'),
  questionsForDoctor: z
    .array(z.string())
    .describe('Suggested questions the patient should ask their doctor, max 8'),
  medicationsToAvoid: z
    .array(
      z.object({
        genericName: z.string().describe('Generic name of the drug to avoid'),
        drugClass: z.string().describe('Drug class'),
        reason: z.string().describe('Brief reason why this drug is dangerous for this LQTS patient'),
      }),
    )
    .describe('Specific medications to avoid, tailored to the doctor specialty context'),
  saferAlternatives: z
    .array(
      z.object({
        genericName: z.string().describe('Generic name of the safer alternative'),
        drugClass: z.string().describe('Drug class of the alternative'),
        whySafer: z.string().describe('Why this is safer for LQTS patients').optional(),
        reason: z.string().describe('Why this is safer for LQTS patients').optional(),
      }).transform((alt) => ({
        genericName: alt.genericName,
        drugClass: alt.drugClass,
        whySafer: alt.whySafer ?? alt.reason ?? '',
      })),
    )
    .describe('Alternatives the doctor might consider instead of QT-prolonging drugs'),
  specialtyWarnings: z
    .array(z.string())
    .describe('Warnings specific to the doctor specialty — e.g. anesthesia concerns for surgeons, sedation for dentists'),
})

export type DoctorPrepAIOutput = z.infer<typeof doctorPrepAISchema>
