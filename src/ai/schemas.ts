import { z } from 'zod'

// ── Combo Analysis Schema ──────────────────────────────────────────

export const drugInteractionSchema = z.object({
  drugA: z.string().describe('First drug in the interaction pair'),
  drugB: z.string().describe('Second drug in the interaction pair'),
  mechanism: z.string().describe('How these drugs interact to increase QT risk'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Severity of this specific interaction'),
})

export const alternativeDrugSchema = z.object({
  genericName: z.string().describe('Generic name of the safer alternative'),
  drugClass: z.string().describe('Drug class of the alternative'),
  whySafer: z.string().describe('Brief explanation of why this is safer for LQTS patients'),
})

export const comboAnalysisSchema = z.object({
  comboRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Overall risk level of the drug combination'),
  summary: z.string().describe('Plain-language summary of the combination risk, suitable for a patient'),
  interactions: z.array(drugInteractionSchema).describe('Specific pairwise interactions found'),
  alternatives: z.array(alternativeDrugSchema).describe('Safer alternatives the patient can discuss with their doctor'),
  genotypeConsiderations: z.string().nullable().describe('Genotype-specific advice if applicable, or null'),
})

// ── Photo Scan Schema ──────────────────────────────────────────────

export const photoScanSchema = z.object({
  detectedDrugNames: z.array(z.string()).describe('Drug names detected in the image'),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Confidence in the reading'),
  rawText: z.string().describe('Raw text read from the image'),
})

// ── Emergency Card Schema ──────────────────────────────────────────

export const emergencyCardSchema = z.object({
  criticalNotes: z.array(z.string()).describe('Critical medical notes for ER personnel, max 5 items'),
})

// ── Doctor Prep Schema ─────────────────────────────────────────────

export const doctorPrepSchema = z.object({
  drugSafetyBrief: z.string().describe('Summary of current medication QT risks for the doctor'),
  questionsForDoctor: z.array(z.string()).describe('Suggested questions the patient should ask'),
  medicationsToAvoid: z.array(z.string()).describe('Specific medications to avoid during treatment'),
  saferAlternatives: z.array(alternativeDrugSchema).describe('Alternatives the doctor might consider'),
})
