import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { triggerTestSOS } from '@/services/sos-notifier'

export async function POST(): Promise<NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contactCount = await prisma.emergencyContact.count({ where: { userId: user.id } })
  if (contactCount === 0) {
    return NextResponse.json(
      { error: 'No emergency contacts configured. Add contacts in Settings first.' },
      { status: 400 },
    )
  }

  const result = await triggerTestSOS(user.id)

  return NextResponse.json(result)
}
