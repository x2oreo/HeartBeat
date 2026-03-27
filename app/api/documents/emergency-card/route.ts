import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateEmergencyCard } from '@/services/document-generator'
import { prisma } from '@/lib/prisma'
import { enhancedEmergencyCardDataSchema } from '@/ai/document-schemas'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody: unknown = await request.json().catch(() => ({}))
    const body: Record<string, unknown> = isRecord(rawBody) ? rawBody : {}
    const extras: { patientPhoto?: string; personalNotes?: { en: string; bg: string } } = {}

    if (typeof body.patientPhoto === 'string' && body.patientPhoto.length > 0) {
      extras.patientPhoto = body.patientPhoto
    }
    const pn = body.personalNotes
    if (isRecord(pn)) {
      if (typeof pn['en'] === 'string' && typeof pn['bg'] === 'string') {
        extras.personalNotes = { en: pn['en'], bg: pn['bg'] }
      }
    }

    const cardData = await generateEmergencyCard(user.id, extras)
    return NextResponse.json(cardData)
  } catch (error) {
    console.error('Emergency card generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate emergency card' },
      { status: 500 },
    )
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const saved = await prisma.sharedEmergencyCard.findUnique({
      where: { userId: user.id },
      select: { cardData: true, slug: true, createdAt: true },
    })

    if (!saved) {
      return NextResponse.json({ error: 'No saved card found' }, { status: 404 })
    }

    const parsed = enhancedEmergencyCardDataSchema.safeParse(saved.cardData)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid saved card data' }, { status: 500 })
    }

    return NextResponse.json({ ...parsed.data, shareSlug: saved.slug })
  } catch (error) {
    console.error('Failed to fetch saved card:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved card' },
      { status: 500 },
    )
  }
}
