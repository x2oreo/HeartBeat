import { prisma } from '@/lib/prisma'
import type { RiskCategory, WatchMonitoringMode } from '@/types'

type DrugAlertPayload = {
  type: 'drug-alert'
  drugName: string
  riskCategory: RiskCategory
  message: string
}

type ModeChangePayload = {
  type: 'mode-change'
  mode: WatchMonitoringMode
  reason: string
}

type PushPayload = DrugAlertPayload | ModeChangePayload

/**
 * Send a push notification to the user's Apple Watch via APNS.
 * Gracefully degrades if APNS is not configured or user has no watch.
 */
export async function notifyWatch(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  // Check if APNS is configured
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const apnsKey = process.env.APNS_KEY

  if (!keyId || !teamId || !apnsKey) {
    console.log('[APNS] Not configured — skipping push notification')
    return false
  }

  // Get user's watch device token
  const device = await prisma.watchDevice.findUnique({
    where: { userId },
    select: { apnsToken: true },
  })

  if (!device?.apnsToken) {
    console.log('[APNS] No device token for user — skipping push')
    return false
  }

  try {
    // Dynamic import to avoid crashes when APNS is not configured
    // @ts-expect-error -- optional dependency, not installed in all environments
    const apn = await import('@parse/node-apn')

    const provider = new apn.Provider({
      token: {
        key: apnsKey,
        keyId,
        teamId,
      },
      production: process.env.NODE_ENV === 'production',
    })

    const notification = new apn.Notification()
    notification.topic = 'com.heartguard.watchapp'
    notification.contentAvailable = true

    if (payload.type === 'drug-alert') {
      notification.alert = {
        title: `Drug Alert: ${payload.drugName}`,
        body: payload.message,
      }
      notification.sound = payload.riskCategory === 'KNOWN_RISK' ? 'default' : 'default'
      notification.payload = {
        type: 'drug-alert',
        drugName: payload.drugName,
        riskCategory: payload.riskCategory,
        message: payload.message,
      }
    } else {
      notification.payload = {
        type: 'mode-change',
        mode: payload.mode,
        reason: payload.reason,
      }
    }

    const result = await provider.send(notification, device.apnsToken)
    provider.shutdown()

    if (result.failed.length > 0) {
      const failure = result.failed[0]
      console.error('[APNS] Push failed:', failure?.response)

      // Invalidate stale device tokens
      const reason = failure?.response?.reason
      if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
        await prisma.watchDevice.update({
          where: { userId },
          data: { apnsToken: null },
        }).catch((err) => {
          console.error('[APNS] Failed to clear invalid token:', err)
        })
      }

      return false
    }

    console.log('[APNS] Push sent successfully')
    return true
  } catch (error) {
    console.error('[APNS] Push error:', error)
    return false
  }
}

/**
 * Notify watch about a risky drug scan and switch to heightened monitoring.
 */
export async function notifyWatchOfDrugRisk(
  userId: string,
  drugName: string,
  riskCategory: RiskCategory
): Promise<void> {
  const riskLabel = riskCategory === 'KNOWN_RISK' ? 'HIGH RISK' : 'POSSIBLE RISK'
  const message = `${drugName} is ${riskLabel} for QT prolongation. Heightened monitoring activated.`

  // Switch to heightened monitoring mode
  await prisma.watchDevice
    .update({
      where: { userId },
      data: { monitoringMode: 'heightened' },
    })
    .catch(() => {}) // User may not have a watch

  // Send push notification
  await notifyWatch(userId, {
    type: 'drug-alert',
    drugName,
    riskCategory,
    message,
  })
}
