import { generateObject } from 'ai'
import { model } from '@/ai/client'
import { emergencyCardAISchema, doctorPrepAISchema } from '@/ai/document-schemas'
import type { EmergencyCardAIOutput } from '@/ai/document-schemas'
import { buildEnhancedEmergencyCardPrompt, buildEnhancedDoctorPrepPrompt } from '@/ai/document-prompts'
import { prisma } from '@/lib/prisma'
import type { EmergencyCardData, DoctorPrepData, Genotype, CypData } from '@/types'

// ── Emergency Card Generation ────────────────────────────────────

export type EnhancedEmergencyCardData = EmergencyCardData & {
  aiContent: EmergencyCardAIOutput
}

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

  const genotype = (user.genotype as Genotype) ?? null
  const medications = user.medications.map((m) => ({
    name: m.genericName,
    riskCategory: m.qtRisk,
    isDTA: m.isDTA,
    cyp: (m.cypData as CypData) ?? { metabolizedBy: [], inhibits: [], induces: [] },
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
    medications: user.medications.map((m) => ({
      name: m.genericName,
      riskCategory: m.qtRisk as EmergencyCardData['medications'][number]['riskCategory'],
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

export type EnhancedDoctorPrepData = DoctorPrepData & {
  procedureSpecificWarnings: string[]
}

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

  const genotype = (user.genotype as Genotype) ?? null
  const medications = user.medications.map((m) => ({
    name: m.genericName,
    riskCategory: m.qtRisk,
    isDTA: m.isDTA,
    cyp: (m.cypData as CypData) ?? { metabolizedBy: [], inhibits: [], induces: [] },
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
    currentMedications: user.medications.map((m) => ({
      name: m.genericName,
      riskCategory: m.qtRisk as DoctorPrepData['currentMedications'][number]['riskCategory'],
      isDTA: m.isDTA,
      cypProfile: (m.cypData as CypData) ?? { metabolizedBy: [], inhibits: [], induces: [] },
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
  cardData: unknown,
): Promise<{ slug: string }> {
  const slug = crypto.randomUUID().slice(0, 8)

  await prisma.sharedEmergencyCard.upsert({
    where: { userId },
    update: {
      slug,
      cardData: JSON.parse(JSON.stringify(cardData)),
    },
    create: {
      userId,
      slug,
      cardData: JSON.parse(JSON.stringify(cardData)),
    },
  })

  return { slug }
}

export async function getSharedEmergencyCard(slug: string) {
  const card = await prisma.sharedEmergencyCard.findUnique({
    where: { slug },
    select: {
      cardData: true,
      createdAt: true,
    },
  })

  if (!card) return null
  return card.cardData as EnhancedEmergencyCardData
}
