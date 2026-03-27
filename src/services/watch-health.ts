import { prisma } from '@/lib/prisma'
import { publish } from '@/lib/sse'
import { triggerSOS } from '@/services/sos-notifier'
import type {
  HealthMetricPayload,
  HealthAlertPayload,
  WatchConfigResponse,
  WatchMonitoringMode,
  Genotype,
  RiskCategory,
} from '@/types'

/**
 * Save a health metric snapshot from the watch and publish to SSE subscribers.
 */
export async function saveHealthMetric(
  userId: string,
  payload: HealthMetricPayload
): Promise<void> {
  await prisma.healthMetric.create({
    data: {
      userId,
      heartRate: payload.heartRate,
      hrv: payload.hrv,
      restingHR: payload.restingHR,
      rrIntervalMs: payload.rrIntervalMs,
      steps: payload.steps,
      activeEnergy: payload.activeEnergy,
      riskLevel: payload.riskLevel,
      stressLevel: payload.stressLevel,
      isAsleep: payload.isAsleep,
      irregularRhythm: payload.irregularRhythm,
      recordedAt: new Date(payload.recordedAt),
    },
  })

  // Update watch last seen
  await prisma.watchDevice
    .update({
      where: { userId },
      data: { lastSeen: new Date() },
    })
    .catch(() => {}) // Non-critical

  // Push to SSE subscribers
  publish(userId, {
    type: 'health-update',
    data: payload,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Save a health alert from the watch and publish to SSE subscribers.
 */
export async function saveHealthAlert(
  userId: string,
  payload: HealthAlertPayload
): Promise<string> {
  const alert = await prisma.healthAlert.create({
    data: {
      userId,
      riskLevel: payload.riskLevel,
      heartRate: payload.heartRate,
      hrv: payload.hrv,
      stressLevel: payload.stressLevel,
      isAsleep: payload.isAsleep,
      irregularRhythm: payload.irregularRhythm,
      message: payload.message,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      triggeredAt: new Date(payload.triggeredAt),
    },
  })

  // Push to SSE subscribers
  publish(userId, {
    type: 'alert',
    data: payload,
    timestamp: new Date().toISOString(),
  })

  // Trigger SOS for ELEVATED alerts (fire-and-forget)
  if (payload.riskLevel === 'ELEVATED') {
    triggerSOS(userId, alert.id).catch((err) => {
      console.error('[SOS] Failed to trigger:', err)
    })
  }

  return alert.id
}

/**
 * Get the most recent health metrics for the dashboard.
 */
export async function getLatestMetrics(
  userId: string,
  limit = 1
): Promise<HealthMetricPayload[]> {
  const metrics = await prisma.healthMetric.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
    take: limit,
    select: {
      heartRate: true,
      hrv: true,
      restingHR: true,
      rrIntervalMs: true,
      steps: true,
      activeEnergy: true,
      riskLevel: true,
      stressLevel: true,
      isAsleep: true,
      irregularRhythm: true,
      recordedAt: true,
    },
  })

  return metrics.map((m) => ({
    heartRate: m.heartRate,
    hrv: m.hrv,
    restingHR: m.restingHR,
    rrIntervalMs: m.rrIntervalMs,
    steps: m.steps,
    activeEnergy: m.activeEnergy,
    riskLevel: m.riskLevel as HealthMetricPayload['riskLevel'],
    stressLevel: m.stressLevel as HealthMetricPayload['stressLevel'],
    isAsleep: m.isAsleep,
    irregularRhythm: m.irregularRhythm,
    recordedAt: m.recordedAt.toISOString(),
  }))
}

/**
 * Get recent health alerts.
 */
export async function getRecentAlerts(userId: string, limit = 10) {
  return prisma.healthAlert.findMany({
    where: { userId },
    orderBy: { triggeredAt: 'desc' },
    take: limit,
    select: {
      id: true,
      riskLevel: true,
      heartRate: true,
      hrv: true,
      stressLevel: true,
      isAsleep: true,
      irregularRhythm: true,
      message: true,
      acknowledged: true,
      triggeredAt: true,
    },
  })
}

/**
 * Acknowledge a health alert.
 */
export async function acknowledgeAlert(
  alertId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.healthAlert.updateMany({
    where: { id: alertId, userId },
    data: { acknowledged: true },
  })
  return result.count > 0
}

/**
 * Update the watch monitoring mode.
 */
export async function updateMonitoringMode(
  userId: string,
  mode: WatchMonitoringMode
): Promise<void> {
  await prisma.watchDevice.update({
    where: { userId },
    data: { monitoringMode: mode },
  })
}

/**
 * Get watch configuration (monitoring mode, user medications, genotype).
 */
export async function getWatchConfig(
  userId: string
): Promise<WatchConfigResponse> {
  const [device, user, medications] = await Promise.all([
    prisma.watchDevice.findUnique({
      where: { userId },
      select: { monitoringMode: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { genotype: true },
    }),
    prisma.medication.findMany({
      where: { userId, active: true },
      select: { genericName: true, qtRisk: true },
    }),
  ])

  return {
    monitoringMode: (device?.monitoringMode ?? 'normal') as WatchMonitoringMode,
    medications: medications.map((m) => ({
      genericName: m.genericName,
      riskCategory: m.qtRisk as RiskCategory,
    })),
    genotype: (user?.genotype as Genotype) ?? null,
  }
}

/**
 * Register or update the APNS device token for push notifications.
 */
export async function registerDeviceToken(
  userId: string,
  apnsToken: string
): Promise<void> {
  await prisma.watchDevice.upsert({
    where: { userId },
    update: { apnsToken, lastSeen: new Date() },
    create: { userId, apnsToken, lastSeen: new Date() },
  })
}

/**
 * Check if a user has a paired watch device.
 */
export async function hasWatchDevice(userId: string): Promise<boolean> {
  const device = await prisma.watchDevice.findUnique({
    where: { userId },
    select: { id: true },
  })
  return device !== null
}
