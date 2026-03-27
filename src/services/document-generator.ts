import { generateObject } from 'ai'
import { z } from 'zod'
import { model } from '@/ai/client'
import {
  emergencyCardAISchema,
  doctorPrepAISchema,
  enhancedEmergencyCardDataSchema,
  riskCategorySchema,
  genotypeSchema,
  cypDataSchema,
} from '@/ai/document-schemas'
import { buildEnhancedEmergencyCardPrompt, buildEnhancedDoctorPrepPrompt } from '@/ai/document-prompts'
import { prisma } from '@/lib/prisma'
import type {
  EnhancedEmergencyCardData,
  EmergencyCardData,
  DoctorPrepData,
  DoctorSpecialty,
  DocumentLanguage,
  ProhibitedDrug,
  SavedDoctorPrepDocumentWithPreview,
} from '@/types'
import qtDrugs from '@/data/qtdrugs.json'
import { groupDrugsByClass } from '@/lib/drug-utils'

const defaultCyp = { metabolizedBy: [] as string[], inhibits: [] as string[], induces: [] as string[] }

const doctorSpecialtySchema = z.enum([
  'Cardiologist',
  'Dentist',
  'General Practitioner',
  'Surgeon',
  'Anesthesiologist',
  'Psychiatrist',
  'ENT',
  'Gastroenterologist',
  'Dermatologist',
  'Ophthalmologist',
  'Other',
])

const documentLanguageSchema = z.enum([
  'English',
  'Bulgarian',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Portuguese',
  'Turkish',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
  'Other',
])

const doctorPrepDataSchema = z.object({
  patientName: z.string(),
  genotype: genotypeSchema,
  currentMedications: z.array(z.object({
    name: z.string(),
    riskCategory: riskCategorySchema,
    isDTA: z.boolean(),
    cypProfile: cypDataSchema,
  })),
  doctorSpecialty: doctorSpecialtySchema,
  customSpecialty: z.string().nullable(),
  language: documentLanguageSchema,
  customLanguage: z.string().nullable(),
  summary: z.string(),
  syndromeExplanation: z.string(),
  drugSafetyBrief: z.string(),
  questionsForDoctor: z.array(z.string()),
  medicationsToAvoid: z.array(z.object({
    genericName: z.string(),
    drugClass: z.string(),
    reason: z.string(),
  })),
  saferAlternatives: z.array(z.object({
    genericName: z.string(),
    drugClass: z.string(),
    whySafer: z.string(),
  })),
  prohibitedDrugs: z.array(z.object({
    genericName: z.string(),
    drugClass: z.string(),
    riskCategory: riskCategorySchema,
    isDTA: z.boolean(),
  })),
  medicationImplications: z.array(z.object({
    name: z.string(),
    implication: z.string(),
  })),
  specialtyWarnings: z.array(z.string()),
  generatedAt: z.string(),
})

function parseCypData(raw: unknown) {
  const result = cypDataSchema.safeParse(raw)
  return result.success ? result.data : defaultCyp
}

// ── Emergency Card Generation ────────────────────────────────────

export async function generateEmergencyCard(
  userId: string,
  extras?: { patientPhoto?: string; personalNotes?: { en: string; bg: string } },
): Promise<EnhancedEmergencyCardData> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      genotype: true,
      medications: {
        where: { active: true },
        select: {
          genericName: true,
          brandName: true,
          dosage: true,
          qtRisk: true,
          isDTA: true,
          cypData: true,
        },
      },
      emergencyContacts: {
        select: {
          name: true,
          phone: true,
          relationship: true,
        },
      },
    },
  })

  const patientName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown Patient'
  const genotype = genotypeSchema.parse(user.genotype)
  const medications = user.medications.map((m) => ({
    name: m.genericName,
    brandName: m.brandName ?? undefined,
    dosage: m.dosage ?? undefined,
    riskCategory: riskCategorySchema.parse(m.qtRisk),
    isDTA: m.isDTA,
    cyp: parseCypData(m.cypData),
  }))

  const prompt = buildEnhancedEmergencyCardPrompt(
    patientName,
    genotype,
    medications,
    user.emergencyContacts,
  )

  const { object: aiContent } = await generateObject({
    model,
    schema: emergencyCardAISchema,
    prompt,
    temperature: 0,
  })

  return {
    patientName,
    genotype,
    medications: medications.map((m) => ({
      name: m.name,
      riskCategory: m.riskCategory satisfies EmergencyCardData['medications'][number]['riskCategory'],
      isDTA: m.isDTA,
      dosage: m.dosage,
      brandName: m.brandName,
    })),
    emergencyContacts: user.emergencyContacts,
    criticalNotes: [aiContent.criticalWarning, ...aiContent.emergencyProtocolSteps.slice(0, 4)],
    generatedAt: new Date().toISOString(),
    shareSlug: '',
    aiContent,
    ...(extras?.patientPhoto ? { patientPhoto: extras.patientPhoto } : {}),
    ...(extras?.personalNotes ? { personalNotes: extras.personalNotes } : {}),
  }
}

// ── Prohibited Drugs List (deterministic, from qtdrugs.json) ─────

function getProhibitedDrugs(): ProhibitedDrug[] {
  const entries = qtDrugs as { genericName: string; drugClass: string; riskCategory: string; isDTA: boolean }[]
  return entries
    .filter((d) => d.riskCategory === 'KNOWN_RISK' || d.isDTA)
    .flatMap((d) => {
      const parsed = riskCategorySchema.safeParse(d.riskCategory)
      if (!parsed.success) return []
      return [{ genericName: d.genericName, drugClass: d.drugClass, riskCategory: parsed.data, isDTA: d.isDTA }]
    })
}

export { groupDrugsByClass }

function buildProhibitedDrugsSummary(drugs: ProhibitedDrug[]): string {
  const byClass = new Map<string, string[]>()
  for (const d of drugs) {
    const list = byClass.get(d.drugClass) ?? []
    list.push(d.genericName)
    byClass.set(d.drugClass, list)
  }
  return Array.from(byClass.entries())
    .map(([cls, names]) => `- ${cls}: ${names.join(', ')}`)
    .join('\n')
}

// ── Doctor Prep Generation ───────────────────────────────────────

export async function generateDoctorPrep(
  userId: string,
  doctorSpecialty: DoctorSpecialty,
  customSpecialty: string | null,
  language: DocumentLanguage,
  customLanguage: string | null,
): Promise<DoctorPrepData> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      genotype: true,
      medications: {
        where: { active: true },
        select: {
          genericName: true,
          qtRisk: true,
          isDTA: true,
          cypData: true,
        },
      },
    },
  })

  const patientName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown Patient'
  const genotype = genotypeSchema.parse(user.genotype)
  const medications = user.medications.map((m) => ({
    name: m.genericName,
    riskCategory: riskCategorySchema.parse(m.qtRisk),
    isDTA: m.isDTA,
    cyp: parseCypData(m.cypData),
  }))

  const prohibitedDrugs = getProhibitedDrugs()
  const prohibitedSummary = buildProhibitedDrugsSummary(prohibitedDrugs)
  const resolvedSpecialty = doctorSpecialty === 'Other' && customSpecialty ? customSpecialty : doctorSpecialty
  const resolvedLanguage = language === 'Other' && customLanguage ? customLanguage : language

  const prompt = buildEnhancedDoctorPrepPrompt(
    patientName,
    genotype,
    medications,
    resolvedSpecialty,
    resolvedLanguage,
    prohibitedSummary,
  )

  const { object: aiContent } = await generateObject({
    model,
    schema: doctorPrepAISchema,
    prompt,
    temperature: 0,
  })

  const documentData: DoctorPrepData = {
    patientName,
    genotype,
    currentMedications: medications.map((m) => ({
      name: m.name,
      riskCategory: m.riskCategory satisfies DoctorPrepData['currentMedications'][number]['riskCategory'],
      isDTA: m.isDTA,
      cypProfile: m.cyp,
    })),
    doctorSpecialty,
    customSpecialty,
    language,
    customLanguage,
    summary: aiContent.summary,
    syndromeExplanation: aiContent.syndromeExplanation,
    drugSafetyBrief: aiContent.drugSafetyBrief,
    questionsForDoctor: aiContent.questionsForDoctor,
    medicationsToAvoid: aiContent.medicationsToAvoid,
    saferAlternatives: aiContent.saferAlternatives,
    prohibitedDrugs,
    medicationImplications: aiContent.medicationImplications,
    specialtyWarnings: aiContent.specialtyWarnings,
    generatedAt: new Date().toISOString(),
  }

  // Persist to database
  const saved = await prisma.doctorPrepDocument.create({
    data: {
      userId,
      doctorSpecialty,
      customSpecialty,
      language,
      customLanguage,
      documentData,
    },
    select: { id: true },
  })

  return { ...documentData, id: saved.id }
}

// ── Doctor Prep Document CRUD ────────────────────────────────────

export async function getDoctorPrepDocuments(userId: string): Promise<SavedDoctorPrepDocumentWithPreview[]> {
  const docs = await prisma.doctorPrepDocument.findMany({
    where: { userId },
    select: {
      id: true,
      doctorSpecialty: true,
      customSpecialty: true,
      language: true,
      customLanguage: true,
      createdAt: true,
      documentData: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return docs.map((d) => {
    const dd = d.documentData as Record<string, unknown> | null
    const meds = Array.isArray(dd?.currentMedications) ? dd.currentMedications : []
    const avoid = Array.isArray(dd?.medicationsToAvoid) ? dd.medicationsToAvoid : []
    const warnings = Array.isArray(dd?.specialtyWarnings) ? dd.specialtyWarnings : []
    // summary field was added later — fall back to briefSnippet for older docs
    const summary = typeof dd?.summary === 'string'
      ? dd.summary
      : typeof dd?.drugSafetyBrief === 'string'
        ? dd.drugSafetyBrief.slice(0, 150)
        : ''

    const specialtyParsed = doctorSpecialtySchema.safeParse(d.doctorSpecialty)
    const languageParsed = documentLanguageSchema.safeParse(d.language)

    return {
      id: d.id,
      doctorSpecialty: specialtyParsed.success ? specialtyParsed.data : ('Other' satisfies DoctorSpecialty),
      customSpecialty: d.customSpecialty,
      language: languageParsed.success ? languageParsed.data : ('Other' satisfies DocumentLanguage),
      customLanguage: d.customLanguage,
      generatedAt: d.createdAt.toISOString(),
      patientName: typeof dd?.patientName === 'string' ? dd.patientName : 'Patient',
      genotype: typeof dd?.genotype === 'string' ? dd.genotype : null,
      medicationNames: meds
        .slice(0, 4)
        .map((m: Record<string, unknown>) => (typeof m?.name === 'string' ? m.name : ''))
        .filter(Boolean),
      avoidCount: avoid.length,
      warningCount: warnings.length,
      summary,
    }
  })
}

export async function getDoctorPrepDocument(
  userId: string,
  documentId: string,
): Promise<DoctorPrepData | null> {
  const doc = await prisma.doctorPrepDocument.findFirst({
    where: { id: documentId, userId },
    select: { id: true, documentData: true },
  })

  if (!doc) return null

  const parsed = doctorPrepDataSchema.safeParse(doc.documentData)
  if (!parsed.success) {
    throw new Error(`Invalid doctor prep document data: ${parsed.error.message}`)
  }
  return { ...parsed.data, id: doc.id }
}

export async function deleteDoctorPrepDocument(
  userId: string,
  documentId: string,
): Promise<boolean> {
  const doc = await prisma.doctorPrepDocument.findFirst({
    where: { id: documentId, userId },
    select: { id: true },
  })

  if (!doc) return false

  await prisma.doctorPrepDocument.delete({ where: { id: documentId } })
  return true
}

// ── Shared Emergency Card (slug-based sharing) ───────────────────

export async function saveSharedEmergencyCard(
  userId: string,
  rawCardData: unknown,
): Promise<{ slug: string }> {
  const cardData = enhancedEmergencyCardDataSchema.parse(rawCardData)

  const existing = await prisma.sharedEmergencyCard.findUnique({
    where: { userId },
    select: { slug: true },
  })
  const slug = existing?.slug ?? crypto.randomUUID()

  const now = new Date()
  await prisma.sharedEmergencyCard.upsert({
    where: { userId },
    update: { slug, cardData, updatedAt: now },
    create: { userId, slug, cardData, updatedAt: now },
  })

  return { slug }
}

export async function getSharedEmergencyCard(slug: string): Promise<EnhancedEmergencyCardData | null> {
  const card = await prisma.sharedEmergencyCard.findUnique({
    where: { slug },
    select: { cardData: true },
  })

  if (!card) return null
  return enhancedEmergencyCardDataSchema.parse(card.cardData)
}
