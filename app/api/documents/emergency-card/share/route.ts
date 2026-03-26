import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { saveSharedEmergencyCard } from '@/services/document-generator'

const shareCardSchema = z.object({
  patientName: z.string().min(1).max(200),
  genotype: z.enum(['LQT1', 'LQT2', 'LQT3', 'OTHER', 'UNKNOWN']).nullable(),
  medications: z.array(z.object({
    name: z.string(),
    riskCategory: z.string(),
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
  aiContent: z.object({
    headline: z.string(),
    criticalWarning: z.string(),
    drugsToAvoidByCategory: z.array(z.object({
      category: z.string(),
      drugs: z.array(z.string()),
    })),
    safeERMedications: z.array(z.object({
      name: z.string(),
      notes: z.string(),
    })),
    emergencyProtocolSteps: z.array(z.string()),
    currentMedicationNotes: z.array(z.object({
      name: z.string(),
      warning: z.string(),
    })),
  }),
  patientPhoto: z.string().optional(),
  personalNotes: z.object({
    en: z.string(),
    bg: z.string(),
  }).optional(),
}).passthrough()

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: unknown = await request.json()
    const parsed = shareCardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid card data', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { slug } = await saveSharedEmergencyCard(user.id, parsed.data)
    return NextResponse.json({ slug, url: `/emergency-card/${slug}` })
  } catch (error) {
    console.error('Failed to share emergency card:', error)
    return NextResponse.json(
      { error: 'Failed to create shareable link' },
      { status: 500 },
    )
  }
}
