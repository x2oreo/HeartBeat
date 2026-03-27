import { prisma } from '@/lib/prisma'
import { publish } from '@/lib/sse'
import { sendSMS, makeVoiceCall, sendAlertEmail } from './notifications'

const SOS_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes
const lastNotified = new Map<string, number>()

type SOSResult = {
  notified: boolean
  contactsReached: number
}

export async function triggerSOS(
  userId: string,
  alertId: string,
  options?: { bypassCooldown?: boolean }
): Promise<SOSResult> {
  // Cooldown check
  if (!options?.bypassCooldown) {
    const lastTime = lastNotified.get(userId)
    if (lastTime && Date.now() - lastTime < SOS_COOLDOWN_MS) {
      console.log(`[SOS] Cooldown active for user ${userId} — skipping`)
      return { notified: false, contactsReached: 0 }
    }
  }

  // Fetch user, contacts, and alert data in parallel
  const [user, contacts, alert] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, genotype: true, email: true },
    }),
    prisma.emergencyContact.findMany({
      where: { userId },
      select: { id: true, name: true, phone: true, email: true, relationship: true },
    }),
    prisma.healthAlert.findUnique({
      where: { id: alertId },
      select: {
        heartRate: true,
        hrv: true,
        irregularRhythm: true,
        message: true,
        riskLevel: true,
        triggeredAt: true,
      },
    }),
  ])

  if (!user || !alert) {
    console.error('[SOS] User or alert not found')
    return { notified: false, contactsReached: 0 }
  }

  if (contacts.length === 0) {
    console.log('[SOS] No emergency contacts configured — skipping')
    return { notified: false, contactsReached: 0 }
  }

  const patientName = user.name ?? 'HeartGuard Patient'
  const timestamp = alert.triggeredAt.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  // Compose messages
  const smsBody = composeSMS(patientName, alert)
  const voiceMessage = composeVoiceMessage(patientName, alert)
  const emailSubject = `EMERGENCY: HeartGuard SOS Alert for ${patientName}`
  const emailHtml = composeEmailHtml(patientName, user.genotype, alert, timestamp)

  // Send notifications to all contacts in parallel
  const notificationLogs: {
    alertId: string
    contactId: string
    channel: string
    status: string
    error: string | null
  }[] = []

  let contactsReached = 0

  await Promise.all(
    contacts.map(async (contact) => {
      const results = await Promise.allSettled([
        sendSMS(contact.phone, smsBody),
        makeVoiceCall(contact.phone, voiceMessage),
        contact.email
          ? sendAlertEmail(contact.email, emailSubject, emailHtml)
          : Promise.resolve({ success: false, error: 'No email configured' }),
      ])

      const channels = ['SMS', 'VOICE', 'EMAIL'] as const
      let contactReached = false

      results.forEach((result, i) => {
        const channel = channels[i]
        if (channel === 'EMAIL' && !contact.email) return // Skip logging if no email

        if (result.status === 'fulfilled') {
          notificationLogs.push({
            alertId,
            contactId: contact.id,
            channel,
            status: result.value.success ? 'SENT' : 'FAILED',
            error: result.value.error ?? null,
          })
          if (result.value.success) contactReached = true
        } else {
          notificationLogs.push({
            alertId,
            contactId: contact.id,
            channel,
            status: 'FAILED',
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          })
        }
      })

      if (contactReached) contactsReached++
    })
  )

  // Log results and update alert
  await Promise.all([
    notificationLogs.length > 0
      ? prisma.notificationLog.createMany({ data: notificationLogs })
      : Promise.resolve(),
    prisma.healthAlert.update({
      where: { id: alertId },
      data: { notifiedContacts: true },
    }),
  ])

  // Update cooldown
  lastNotified.set(userId, Date.now())

  // Publish SSE event
  publish(userId, {
    type: 'sos-sent',
    data: { alertId, contactsReached },
    timestamp: new Date().toISOString(),
  })

  console.log(`[SOS] Notified ${contactsReached}/${contacts.length} contacts for alert ${alertId}`)

  return { notified: true, contactsReached }
}

// ── Helpers ───────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isManualSOS(alert: { heartRate: number; message: string }): boolean {
  return alert.heartRate === 0 && alert.message === 'Manual SOS triggered by user'
}

// ── Message Composers ────────────────────────────────────────────────

function composeSMS(
  patientName: string,
  alert: { heartRate: number; irregularRhythm: boolean; message: string }
): string {
  if (isManualSOS(alert)) {
    return (
      `HEARTGUARD SOS ALERT\n\n` +
      `${patientName} (Long QT Syndrome patient) has manually triggered an emergency SOS.\n\n` +
      `Please respond immediately and contact the patient.\n\n` +
      `This is an automated emergency alert from HeartGuard.`
    )
  }

  return (
    `HEARTGUARD SOS ALERT\n\n` +
    `${patientName} (Long QT Syndrome patient) — Dangerous cardiac event detected.\n\n` +
    `Heart Rate: ${Math.round(alert.heartRate)} BPM\n` +
    `Irregular Rhythm: ${alert.irregularRhythm ? 'YES' : 'No'}\n` +
    `Details: ${alert.message}\n\n` +
    `This is an automated emergency alert from HeartGuard.`
  )
}

function composeVoiceMessage(
  patientName: string,
  alert: { heartRate: number; irregularRhythm: boolean; message: string }
): string {
  if (isManualSOS(alert)) {
    return (
      `This is an emergency alert from HeartGuard. ` +
      `${patientName}, a Long QT Syndrome patient, has manually triggered an emergency SOS. ` +
      `Please respond immediately and contact the patient.`
    )
  }

  return (
    `This is an emergency alert from HeartGuard. ` +
    `${patientName}, a Long QT Syndrome patient, has experienced a dangerous cardiac event. ` +
    `Their heart rate is ${Math.round(alert.heartRate)} beats per minute` +
    `${alert.irregularRhythm ? ' with an irregular rhythm detected' : ''}. ` +
    `Please respond immediately. Check your text messages for more details.`
  )
}

function composeEmailHtml(
  patientName: string,
  genotype: string | null,
  alert: {
    heartRate: number
    hrv: number
    irregularRhythm: boolean
    riskLevel: string
    message: string
  },
  timestamp: string
): string {
  const safeName = escapeHtml(patientName)
  const safeGenotype = genotype ? escapeHtml(genotype) : null
  const safeMessage = escapeHtml(alert.message)
  const manual = isManualSOS(alert)

  const vitalsRows = manual
    ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Trigger</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: 700;">Manual SOS by patient</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Time</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapeHtml(timestamp)}</td>
      </tr>`
    : `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Heart Rate</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: 700; font-size: 18px;">${alert.heartRate} BPM</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">HRV</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${alert.hrv} ms</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Irregular Rhythm</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: ${alert.irregularRhythm ? '#ef4444' : '#22c55e'}; font-weight: 700;">${alert.irregularRhythm ? 'DETECTED' : 'Not detected'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Risk Level</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: 700;">${escapeHtml(alert.riskLevel)}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Time</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapeHtml(timestamp)}</td>
      </tr>`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ef4444; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">EMERGENCY ALERT</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">HeartGuard SOS</p>
  </div>
  <div style="border: 2px solid #ef4444; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
    <h2 style="margin: 0 0 16px; color: #1a1a1a;">${safeName}</h2>
    <p style="color: #666; margin: 0 0 20px;">Long QT Syndrome Patient${safeGenotype ? ` (${safeGenotype})` : ''}</p>

    <table style="width: 100%; border-collapse: collapse;">${vitalsRows}
    </table>

    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 20px;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">${safeMessage}</p>
    </div>

    <p style="margin-top: 24px; color: #666; font-size: 13px; text-align: center;">
      This is an automated emergency alert from HeartGuard.<br>
      Please respond immediately and contact the patient.
    </p>
  </div>
</body>
</html>`
}
