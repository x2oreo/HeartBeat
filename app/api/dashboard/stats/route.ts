import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { DashboardStats, ScanActivityDay, HeartRatePoint } from '@/types'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [scansRaw, healthMetrics, watchDevice] = await Promise.all([
    prisma.scanLog.findMany({
      where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
      select: { riskCategory: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.healthMetric.findMany({
      where: { userId: user.id, recordedAt: { gte: twentyFourHoursAgo } },
      select: { heartRate: true, hrv: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
    }),
    prisma.watchDevice.findFirst({
      where: { userId: user.id },
      select: { lastSeen: true },
    }),
  ])

  // Build 7-day scan activity
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const scanActivity: ScanActivityDay[] = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = day.toISOString().split('T')[0]
    const dayScans = scansRaw.filter(
      (s) => s.createdAt.toISOString().split('T')[0] === dateStr,
    )
    scanActivity.push({
      date: dateStr,
      label: dayLabels[day.getDay()],
      count: dayScans.length,
      knownRisk: dayScans.filter((s) => s.riskCategory === 'KNOWN_RISK').length,
      possibleRisk: dayScans.filter((s) => s.riskCategory === 'POSSIBLE_RISK').length,
      conditionalRisk: dayScans.filter((s) => s.riskCategory === 'CONDITIONAL_RISK').length,
      safe: dayScans.filter((s) => s.riskCategory === 'NOT_LISTED').length,
    })
  }

  // Health summary
  const avgHR24h =
    healthMetrics.length > 0
      ? Math.round(healthMetrics.reduce((sum, m) => sum + m.heartRate, 0) / healthMetrics.length)
      : null
  const avgHrv24h =
    healthMetrics.length > 0
      ? Math.round(healthMetrics.reduce((sum, m) => sum + m.hrv, 0) / healthMetrics.length)
      : null

  // Sample up to 24 evenly-spaced points for sparkline
  const heartRateHistory: HeartRatePoint[] = []
  if (healthMetrics.length > 0) {
    const step = Math.max(1, Math.floor(healthMetrics.length / 24))
    for (let i = 0; i < healthMetrics.length; i += step) {
      const m = healthMetrics[i]
      heartRateHistory.push({
        time: m.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hr: Math.round(m.heartRate),
      })
    }
  }

  const stats: DashboardStats = {
    scanActivity,
    healthSummary: {
      avgHR24h,
      avgHrv24h,
      watchPaired: !!watchDevice,
      watchLastSeen: watchDevice?.lastSeen?.toISOString() ?? null,
    },
    heartRateHistory,
  }

  return NextResponse.json(stats)
}
