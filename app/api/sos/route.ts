import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { triggerSOS } from '@/services/sos-notifier'

const sosSchema = z.object({
  alertId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  /** GPS accuracy in metres from browser Geolocation API. */
  accuracy: z.number().positive().optional(),
  /** True when coordinates come from a localStorage cache, not a live GPS fix. */
  locationCached: z.boolean().optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = sosSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  let alertId = parsed.data.alertId

  // If no alertId provided, create a synthetic alert for manual SOS
  if (!alertId) {
    const alert = await prisma.healthAlert.create({
      data: {
        userId: user.id,
        riskLevel: 'ELEVATED',
        heartRate: 0,
        hrv: 0,
        stressLevel: 'HIGH',
        isAsleep: false,
        irregularRhythm: false,
        message: 'Manual SOS triggered by user',
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        triggeredAt: new Date(),
      },
    })
    alertId = alert.id
  } else {
    // Verify the alert belongs to this user
    const alert = await prisma.healthAlert.findFirst({
      where: { id: alertId, userId: user.id },
      select: { id: true },
    })
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
  }

  const result = await triggerSOS(user.id, alertId, {
    bypassCooldown: true,
    locationAccuracy: parsed.data.accuracy,
    locationCached: parsed.data.locationCached,
  })

  return NextResponse.json({
    success: true,
    notified: result.notified,
    contactsReached: result.contactsReached,
  })
}
