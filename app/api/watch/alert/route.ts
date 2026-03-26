import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getWatchUser } from '@/lib/watch-auth'
import { saveHealthAlert } from '@/services/watch-health'

const alertSchema = z.object({
  riskLevel: z.enum(['CAUTION', 'ELEVATED']),
  heartRate: z.number().min(0).max(300),
  hrv: z.number().min(0).max(500),
  stressLevel: z.enum(['CALM', 'MODERATE', 'HIGH']),
  isAsleep: z.boolean(),
  irregularRhythm: z.boolean(),
  message: z.string().max(500),
  triggeredAt: z.string().datetime().refine((dateStr) => {
    const date = new Date(dateStr)
    const now = Date.now()
    return date.getTime() >= now - 24 * 60 * 60 * 1000 && date.getTime() <= now + 5 * 60 * 1000
  }, 'triggeredAt must be within the last 24 hours'),
})

export async function POST(request: Request) {
  const user = await getWatchUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = alertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const alertId = await saveHealthAlert(user.id, parsed.data)

  return NextResponse.json({ success: true, alertId })
}
