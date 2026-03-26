import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { saveSharedEmergencyCard } from '@/services/document-generator'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cardData = await request.json()
    const { slug } = await saveSharedEmergencyCard(user.id, cardData)
    return NextResponse.json({ slug, url: `/emergency-card/${slug}` })
  } catch (error) {
    console.error('Failed to share emergency card:', error)
    return NextResponse.json(
      { error: 'Failed to create shareable link' },
      { status: 500 },
    )
  }
}
