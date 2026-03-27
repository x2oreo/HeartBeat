import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generatePairingCode } from '@/lib/watch-auth'
import { prisma } from '@/lib/prisma'

// POST — Generate a new pairing code (called from web settings)
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = await generatePairingCode(user.id)

  return NextResponse.json({ code, expiresInSeconds: 300 })
}

// GET — Check pairing status
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const device = await prisma.watchDevice.findUnique({
    where: { userId: user.id },
    select: {
      lastSeen: true,
      monitoringMode: true,
      apnsToken: true,
    },
  })

  if (!device) {
    return NextResponse.json({ paired: false })
  }

  return NextResponse.json({
    paired: true,
    lastSeen: device.lastSeen.toISOString(),
    monitoringMode: device.monitoringMode,
    hasPushToken: device.apnsToken !== null,
  })
}
