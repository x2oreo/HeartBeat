import { z } from 'zod'

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

// ── Doctor Prep AI Schema ────────────────────────────────────────

export const doctorPrepAISchema = z.object({
  drugSafetyBrief: z
    .string()
    .describe('Summary of current medication QT risks, written for a physician audience'),
  questionsForDoctor: z
    .array(z.string())
    .describe('Suggested questions the patient should ask their doctor, max 8'),
  medicationsToAvoid: z
    .array(z.string())
    .describe('Specific medications to avoid during/around the procedure or treatment'),
  saferAlternatives: z
    .array(
      z.object({
        genericName: z.string().describe('Generic name of the safer alternative'),
        drugClass: z.string().describe('Drug class of the alternative'),
        whySafer: z.string().describe('Brief explanation of why this is safer for LQTS patients'),
      }),
    )
    .describe('Alternatives the doctor might consider instead of QT-prolonging drugs'),
  procedureSpecificWarnings: z
    .array(z.string())
    .describe('Warnings specific to the procedure type — empty array if no procedure specified'),
})

export type DoctorPrepAIOutput = z.infer<typeof doctorPrepAISchema>
