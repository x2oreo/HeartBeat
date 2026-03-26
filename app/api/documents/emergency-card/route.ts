import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateEmergencyCard } from '@/services/document-generator'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const extras: { patientPhoto?: string; personalNotes?: { en: string; bg: string } } = {}

    if (typeof body.patientPhoto === 'string' && body.patientPhoto.length > 0) {
      extras.patientPhoto = body.patientPhoto
    }
    if (
      body.personalNotes &&
      typeof body.personalNotes === 'object' &&
      body.personalNotes !== null &&
      'en' in body.personalNotes &&
      'bg' in body.personalNotes
    ) {
      const notes = body.personalNotes as { en: unknown; bg: unknown }
      if (typeof notes.en === 'string' && typeof notes.bg === 'string') {
        extras.personalNotes = { en: notes.en, bg: notes.bg }
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

    return NextResponse.json({ ...saved.cardData as object, shareSlug: saved.slug })
  } catch (error) {
    console.error('Failed to fetch saved card:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved card' },
      { status: 500 },
    )
  }
}
