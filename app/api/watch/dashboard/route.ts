import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type {
  WatchDashboardData,
  HeartRatePoint,
  HRVPoint,
  RiskTimelinePoint,
  WatchAlert,
  WatchTodayStats,
} from '@/types'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [allMetrics24h, todayMetrics, alerts, watchDevice] = await Promise.all([
    prisma.healthMetric.findMany({
      where: { userId: user.id, recordedAt: { gte: twentyFourHoursAgo } },
      select: {
        heartRate: true,
        hrv: true,
        restingHR: true,
        steps: true,
        activeEnergy: true,
        riskLevel: true,
        stressLevel: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: 'asc' },
    }),
    prisma.healthMetric.findMany({
      where: { userId: user.id, recordedAt: { gte: startOfToday } },
      select: {
        heartRate: true,
        hrv: true,
        steps: true,
        activeEnergy: true,
      },
    }),
    prisma.healthAlert.findMany({
      where: { userId: user.id },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
      select: {
        id: true,
        riskLevel: true,
        heartRate: true,
        hrv: true,
        message: true,
        acknowledged: true,
        triggeredAt: true,
      },
    }),
    prisma.watchDevice.findFirst({
      where: { userId: user.id },
      select: { lastSeen: true, monitoringMode: true },
    }),
  ])

  // Sample 24h metrics to ~100 points for charts
  const heartRate: HeartRatePoint[] = []
  const hrv: HRVPoint[] = []
  const riskTimeline: RiskTimelinePoint[] = []

  if (allMetrics24h.length > 0) {
    const step = Math.max(1, Math.floor(allMetrics24h.length / 100))
    for (let i = 0; i < allMetrics24h.length; i += step) {
      const m = allMetrics24h[i]
      const time = m.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      heartRate.push({ time, hr: Math.round(m.heartRate) })
      hrv.push({ time, hrv: Math.round(m.hrv) })
    }

    // Risk timeline: capture every risk-level change
    let lastLevel = ''
    for (const m of allMetrics24h) {
      if (m.riskLevel !== lastLevel) {
        riskTimeline.push({
          time: m.recordedAt.toISOString(),
          level: m.riskLevel as RiskTimelinePoint['level'],
        })
        lastLevel = m.riskLevel
      }
    }
  }

  // Today's aggregate stats
  const todayStats: WatchTodayStats = {
    totalSteps: todayMetrics.reduce((sum, m) => sum + m.steps, 0),
    totalActiveEnergy: Math.round(todayMetrics.reduce((sum, m) => sum + m.activeEnergy, 0)),
    avgHR: todayMetrics.length > 0
      ? Math.round(todayMetrics.reduce((sum, m) => sum + m.heartRate, 0) / todayMetrics.length)
      : null,
    avgHRV: todayMetrics.length > 0
      ? Math.round(todayMetrics.reduce((sum, m) => sum + m.hrv, 0) / todayMetrics.length)
      : null,
    minHR: todayMetrics.length > 0
      ? Math.round(Math.min(...todayMetrics.map((m) => m.heartRate)))
      : null,
    maxHR: todayMetrics.length > 0
      ? Math.round(Math.max(...todayMetrics.map((m) => m.heartRate)))
      : null,
  }

  const serializedAlerts: WatchAlert[] = alerts.map((a) => ({
    id: a.id,
    riskLevel: a.riskLevel,
    heartRate: a.heartRate,
    hrv: a.hrv,
    message: a.message,
    acknowledged: a.acknowledged,
    triggeredAt: a.triggeredAt.toISOString(),
  }))

  const data: WatchDashboardData = {
    metrics: { heartRate, hrv, riskTimeline },
    todayStats,
    alerts: serializedAlerts,
    device: {
      paired: !!watchDevice,
      lastSeen: watchDevice?.lastSeen?.toISOString() ?? null,
      monitoringMode: watchDevice?.monitoringMode ?? 'normal',
    },
  }

  return NextResponse.json(data)
}
