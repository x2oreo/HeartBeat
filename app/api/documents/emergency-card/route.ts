import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateEmergencyCard } from '@/services/document-generator'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cardData = await generateEmergencyCard(user.id)
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
