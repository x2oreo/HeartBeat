import { z } from 'zod'

// Response when Claude analyzes a risky drug against the patient's current medications.

export const ComboAnalysisSchema = z.object({
  comboRisk: z.object({
    level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .describe('Overall combination risk level considering additive QT prolongation and CYP interactions'),
    explanation: z.string()
      .describe('Plain-language explanation of why this drug combination is dangerous, written for a patient to understand'),
    interactions: z.array(
      z.object({
        drug1: z.string().describe('First drug in the interaction pair'),
        drug2: z.string().describe('Second drug in the interaction pair'),
        type: z.enum(['ADDITIVE_QT', 'CYP_INHIBITION', 'CYP_INDUCTION', 'OTHER'])
          .describe('Type of interaction: ADDITIVE_QT = both prolong QT, CYP_INHIBITION = one inhibits metabolism of the other increasing plasma levels, CYP_INDUCTION = one induces metabolism reducing efficacy, OTHER = other mechanism'),
        mechanism: z.string()
          .describe('How these two drugs interact at a pharmacological level'),
        clinicalSignificance: z.string()
          .describe('What this interaction means for the patient in practical terms'),
      })
    ).describe('All pairwise drug interactions found between the new drug and current medications'),
    additiveQTCount: z.number()
      .describe('Number of the patient\'s current medications that also prolong the QT interval, contributing to additive risk'),
  }),
  genotypeConsiderations: z.string().nullable()
    .describe('Genotype-specific advice if the patient\'s LQTS subtype is known — e.g. LQT1 patients should avoid exercise-related triggers, LQT2 are sensitive to auditory stimuli, LQT3 risk is highest during sleep. Return null if genotype is unknown or not relevant to this combination.'),
  alternatives: z.array(
    z.object({
      genericName: z.string().describe('Generic name of the safer alternative drug'),
      brandName: z.string().optional()
        .describe('Common brand name of the alternative, if well-known'),
      drugClass: z.string().describe('Pharmacological class of the alternative'),
      whySafer: z.string()
        .describe('Why this alternative is safer for LQTS patients — e.g. does not prolong QT, no CYP conflicts'),
      caveats: z.string().optional()
        .describe('Any caveats or limitations of this alternative the patient should know'),
    })
  ).describe('2-3 safer alternative medications the patient can discuss with their doctor'),
})

export type ComboAnalysis = z.infer<typeof ComboAnalysisSchema>

// Response when Claude Vision reads a medication photo.

export const DetectedDrugsSchema = z.object({
  drugs: z.array(
    z.object({
      name: z.string().describe('Medication name as read from the packaging or label'),
      dosage: z.string().optional()
        .describe('Dosage if visible on the packaging (e.g. "500mg", "10mg/5ml")'),
      confidence: z.enum(['HIGH', 'MEDIUM', 'LOW'])
        .describe('Confidence in the drug name reading: HIGH = clearly legible, MEDIUM = partially obscured but likely correct, LOW = best guess from blurry/partial text'),
    })
  ).describe('All medication names detected in the image'),
  imageQuality: z.enum(['CLEAR', 'PARTIAL', 'UNREADABLE'])
    .describe('Overall image quality: CLEAR = text fully legible, PARTIAL = some text readable, UNREADABLE = cannot extract drug names'),
  notes: z.string().optional()
    .describe('Any additional observations about the image, e.g. "multiple medications visible", "image is rotated"'),
})

export type DetectedDrugs = z.infer<typeof DetectedDrugsSchema>

// Response when a scanned drug is not found in our qtdrugs.json database.

export const UnknownDrugSchema = z.object({
  isRealDrug: z.boolean()
    .describe('Whether the input appears to be a real medication name (true) or gibberish/misspelling/non-drug (false)'),
  genericName: z.string().optional()
    .describe('The correct generic/INN name of the drug if recognized'),
  drugClass: z.string().optional()
    .describe('Pharmacological class of the drug if recognized (e.g. "SSRI antidepressant", "Beta-blocker")'),
  primaryUse: z.string().optional()
    .describe('What the drug is commonly prescribed for, in plain language'),
  qtRiskAssessment: z.enum(['LIKELY_SAFE', 'POSSIBLE_RISK', 'UNKNOWN', 'NOT_A_DRUG'])
    .describe('Assessment of QT prolongation risk: LIKELY_SAFE = no known QT effect, POSSIBLE_RISK = some evidence of QT prolongation, UNKNOWN = insufficient data to assess, NOT_A_DRUG = input is not a medication'),
  reasoning: z.string()
    .describe('Explanation of why this risk assessment was given, referencing the drug\'s pharmacology'),
  recommendation: z.string()
    .describe('What the patient should do — e.g. "Consult your cardiologist before taking this medication" or "This does not appear to be a medication name"'),
})

export type UnknownDrug = z.infer<typeof UnknownDrugSchema>
