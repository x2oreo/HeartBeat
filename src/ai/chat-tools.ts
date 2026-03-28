import { tool } from 'ai'
import { z } from 'zod'
import { scanDrugByText } from '@/services/drug-scanner'
import { generateEmergencyCard, generateDoctorPrep } from '@/services/document-generator'
import { lookupDrug, searchDrugs } from '@/services/drug-lookup'
import { prisma } from '@/lib/prisma'
import type { ScanResult, EnhancedEmergencyCardData, DoctorPrepData, DrugInfo } from '@/types'


export type ChatToolResult =
  | { toolName: 'scan_drug'; result: ScanResult }
  | { toolName: 'generate_emergency_card'; result: EnhancedEmergencyCardData }
  | { toolName: 'generate_doctor_prep'; result: DoctorPrepData }
  | { toolName: 'get_medications'; result: MedicationListResult }
  | { toolName: 'lookup_drug_info'; result: DrugLookupResult }

type MedicationListResult = {
  medications: {
    id: string
    genericName: string
    brandName: string | null
    dosage: string | null
    qtRisk: string
    isDTA: boolean
  }[]
  count: number
}

type DrugLookupResult = {
  found: boolean
  drug: DrugInfo | null
  suggestions: { genericName: string; riskCategory: string }[]
}

// Each tool wraps an existing service function. The userId is injected via
// closure so the model never sees or controls it.

export function buildChatTools(userId: string) {
  return {
    scan_drug: tool({
      description:
        'Check if a medication is safe for a patient with Long QT Syndrome. Runs multi-source verification (local database, CredibleMeds, FDA, AI analysis) and checks interactions with the patient\'s current medications. ALWAYS use this tool when the user asks about a specific medication.',
      inputSchema: z.object({
        drugName: z.string().describe('The medication name to check (generic or brand name)'),
        dosage: z.string().optional().describe('Optional dosage information (e.g., "500mg", "20mg daily")'),
      }),
      execute: async ({ drugName, dosage }): Promise<ScanResult> => {
        return scanDrugByText(drugName, userId, dosage)
      },
    }),


    generate_emergency_card: tool({
      description:
        'Generate an Emergency Card for the patient that ER staff can use during emergencies. Contains critical LQTS information, medications to avoid, safe ER medications, and emergency protocols. Use when the user asks to create, generate, or update their emergency card.',
      inputSchema: z.object({
        personalNotes: z.object({
          en: z.string(),
          bg: z.string(),
        }).optional().describe('Optional personal notes in English and Bulgarian'),
      }),
      execute: async ({ personalNotes }): Promise<EnhancedEmergencyCardData> => {
        return generateEmergencyCard(userId, personalNotes ? { personalNotes } : undefined)
      },
    }),

    generate_doctor_prep: tool({
      description:
        'Generate a Doctor Visit Preparation document tailored to a specific medical specialty. Contains drug safety briefing, questions for the doctor, medications to avoid, and specialty-specific warnings. Use when the user mentions seeing a doctor, preparing for an appointment, or asks about a medical specialty.',
      inputSchema: z.object({
        doctorSpecialty: z.enum([
          'Cardiologist', 'Dentist', 'General Practitioner', 'Surgeon',
          'Anesthesiologist', 'Psychiatrist', 'ENT', 'Gastroenterologist',
          'Dermatologist', 'Ophthalmologist', 'Other',
        ]).describe('The type of doctor the patient is visiting'),
        customSpecialty: z.string().nullable().optional().describe('Custom specialty name if "Other" is selected'),
        language: z.enum([
          'English', 'Bulgarian', 'German', 'French', 'Spanish', 'Italian',
          'Portuguese', 'Turkish', 'Arabic', 'Chinese', 'Japanese', 'Korean', 'Other',
        ]).default('English').describe('Language for the document'),
        customLanguage: z.string().nullable().optional().describe('Custom language name if "Other" is selected'),
      }),
      execute: async ({ doctorSpecialty, customSpecialty, language, customLanguage }): Promise<DoctorPrepData> => {
        return generateDoctorPrep(userId, doctorSpecialty, customSpecialty ?? null, language, customLanguage ?? null)
      },
    }),

    get_medications: tool({
      description:
        'Get the patient\'s complete list of all current active medications with their QT risk categories. Returns all medications unconditionally (no filtering). Use when the user asks to see their medications or when you need context about current drug interactions.',
      inputSchema: z.object({}),
      execute: async (): Promise<MedicationListResult> => {
        const medications = await prisma.medication.findMany({
          where: { userId, active: true },
          select: {
            id: true,
            genericName: true,
            brandName: true,
            dosage: true,
            qtRisk: true,
            isDTA: true,
          },
          orderBy: { addedAt: 'desc' },
        })
        return { medications, count: medications.length }
      },
    }),

    lookup_drug_info: tool({
      description:
        'Quick lookup of a drug in the local QT risk database. Returns basic drug information without running the full scan pipeline. Use for quick info or when the user asks general questions about a drug class, mechanism, or CYP interactions. For full safety checks, use scan_drug instead.',
      inputSchema: z.object({
        drugName: z.string().describe('The drug name to look up'),
      }),
      execute: async ({ drugName }): Promise<DrugLookupResult> => {
        const drug = lookupDrug(drugName)
        const suggestions = drug ? [] : searchDrugs(drugName, 5).map((d) => ({
          genericName: d.genericName,
          riskCategory: d.riskCategory,
        }))
        return { found: drug !== null, drug, suggestions }
      },
    }),
  }
}
