import { generateObject } from 'ai'
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

const defaultCyp = { metabolizedBy: [] as string[], inhibits: [] as string[], induces: [] as string[] }

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
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown Patient',
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
    patientName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown Patient',
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
  return (qtDrugs as { genericName: string; drugClass: string; riskCategory: string; isDTA: boolean }[])
    .filter((d) => d.riskCategory === 'KNOWN_RISK' || d.isDTA)
    .map((d) => ({
      genericName: d.genericName,
      drugClass: d.drugClass,
      riskCategory: d.riskCategory as ProhibitedDrug['riskCategory'],
      isDTA: d.isDTA,
    }))
}

export function groupDrugsByClass(drugs: ProhibitedDrug[]): Map<string, ProhibitedDrug[]> {
  const byClass = new Map<string, ProhibitedDrug[]>()
  for (const drug of drugs) {
    const list = byClass.get(drug.drugClass) ?? []
    list.push(drug)
    byClass.set(drug.drugClass, list)
  }
  return byClass
}

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
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown Patient',
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
    patientName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown Patient',
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

    return {
      id: d.id,
      doctorSpecialty: d.doctorSpecialty as DoctorSpecialty,
      customSpecialty: d.customSpecialty,
      language: d.language as DocumentLanguage,
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
  return { ...(doc.documentData as unknown as DoctorPrepData), id: doc.id }
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

  await prisma.sharedEmergencyCard.upsert({
    where: { userId },
    update: { cardData },
    create: { userId, slug, cardData },
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
