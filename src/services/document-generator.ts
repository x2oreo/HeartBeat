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
import type { EnhancedEmergencyCardData, EnhancedDoctorPrepData, EmergencyCardData, DoctorPrepData } from '@/types'

const defaultCyp = { metabolizedBy: [], inhibits: [], induces: [] }

// ── Emergency Card Generation ────────────────────────────────────

export async function generateEmergencyCard(userId: string): Promise<EnhancedEmergencyCardData> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
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
    riskCategory: riskCategorySchema.parse(m.qtRisk),
    isDTA: m.isDTA,
    cyp: cypDataSchema.safeParse(m.cypData).success ? cypDataSchema.parse(m.cypData) : defaultCyp,
  }))

  const prompt = buildEnhancedEmergencyCardPrompt(
    user.name ?? 'Unknown Patient',
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
    patientName: user.name ?? 'Unknown Patient',
    genotype,
    medications: medications.map((m) => ({
      name: m.name,
      riskCategory: m.riskCategory satisfies EmergencyCardData['medications'][number]['riskCategory'],
      isDTA: m.isDTA,
    })),
    emergencyContacts: user.emergencyContacts,
    criticalNotes: [aiContent.criticalWarning, ...aiContent.emergencyProtocolSteps.slice(0, 4)],
    generatedAt: new Date().toISOString(),
    shareSlug: '',
    aiContent,
  }
}

// ── Doctor Prep Generation ───────────────────────────────────────

export async function generateDoctorPrep(
  userId: string,
  procedureType: string | null,
): Promise<EnhancedDoctorPrepData> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
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
    cyp: cypDataSchema.safeParse(m.cypData).success ? cypDataSchema.parse(m.cypData) : defaultCyp,
  }))

  const prompt = buildEnhancedDoctorPrepPrompt(
    user.name ?? 'Unknown Patient',
    genotype,
    medications,
    procedureType,
  )

  const { object: aiContent } = await generateObject({
    model,
    schema: doctorPrepAISchema,
    prompt,
    temperature: 0,
  })

  return {
    patientName: user.name ?? 'Unknown Patient',
    genotype,
    currentMedications: medications.map((m) => ({
      name: m.name,
      riskCategory: m.riskCategory satisfies DoctorPrepData['currentMedications'][number]['riskCategory'],
      isDTA: m.isDTA,
      cypProfile: m.cyp,
    })),
    procedureType,
    drugSafetyBrief: aiContent.drugSafetyBrief,
    questionsForDoctor: aiContent.questionsForDoctor,
    medicationsToAvoid: aiContent.medicationsToAvoid,
    saferAlternatives: aiContent.saferAlternatives,
    procedureSpecificWarnings: aiContent.procedureSpecificWarnings,
    generatedAt: new Date().toISOString(),
  }
}

// ── Shared Emergency Card (slug-based sharing) ───────────────────

export async function saveSharedEmergencyCard(
  userId: string,
  rawCardData: unknown,
): Promise<{ slug: string }> {
  const cardData = enhancedEmergencyCardDataSchema.parse(rawCardData)
  const slug = crypto.randomUUID()

  await prisma.sharedEmergencyCard.upsert({
    where: { userId },
    update: { slug, cardData },
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
