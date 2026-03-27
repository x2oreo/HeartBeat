import { prisma } from '@/lib/prisma'
import { publish } from '@/lib/sse'
import { sendSMS, makeVoiceCall, sendAlertEmail } from './notifications'
import { reverseGeocodeWithCountry } from './notifications/geocoding'
import { getEmergencyInfo } from '@/data/country-emergency-numbers'
import type { CountryEmergencyInfo } from '@/types'

const SOS_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes
const lastNotified = new Map<string, number>()

const GENOTYPE_TRIGGERS: Record<string, string> = {
  LQT1: 'Common triggers: physical exertion, swimming, exercise',
  LQT2: 'Common triggers: sudden loud noises, emotional stress, alarm clocks',
  LQT3: 'Common triggers: events during rest or sleep',
}

const QT_RISK_LABELS: Record<string, string> = {
  KNOWN_RISK: 'KNOWN QT RISK',
  POSSIBLE_RISK: 'POSSIBLE QT RISK',
  CONDITIONAL_RISK: 'CONDITIONAL QT RISK',
}

type SOSResult = {
  notified: boolean
  contactsReached: number
}

type SOSOptions = {
  bypassCooldown?: boolean
  /** GPS accuracy in metres from browser Geolocation API. Absent for watch-triggered SOS. */
  locationAccuracy?: number
  /** True when coordinates come from a localStorage cache, not a live GPS fix. */
  locationCached?: boolean
}

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function triggerSOS(
  userId: string,
  alertId: string,
  options?: SOSOptions,
): Promise<SOSResult> {
  // Cooldown check
  if (!options?.bypassCooldown) {
    const lastTime = lastNotified.get(userId)
    if (lastTime && Date.now() - lastTime < SOS_COOLDOWN_MS) {
      console.log(`[SOS] Cooldown active for user ${userId} — skipping`)
      return { notified: false, contactsReached: 0 }
    }
  }

  // Fetch user (with medications), contacts, alert, and emergency card in parallel
  const [user, contacts, alert, emergencyCard] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        genotype: true,
        email: true,
        country: true,
        medications: {
          where: { active: true },
          select: { genericName: true, brandName: true, qtRisk: true },
          orderBy: { addedAt: 'desc' },
        },
      },
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
        stressLevel: true,
        isAsleep: true,
        latitude: true,
        longitude: true,
        triggeredAt: true,
      },
    }),
    prisma.sharedEmergencyCard.findFirst({
      where: { userId },
      select: { slug: true },
      orderBy: { createdAt: 'desc' },
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

  // Reverse geocode the location if coordinates are available.
  // Failure is safe — reverseGeocodeWithCountry() never throws and returns nulls on any error.
  const geocodeResult =
    alert.latitude != null && alert.longitude != null
      ? await reverseGeocodeWithCountry(alert.latitude, alert.longitude)
      : { address: null, countryCode: null }

  const geocodedAddress = geocodeResult.address

  // Determine the patient's country for emergency number lookup.
  // Prefer geocoded country (reflects current physical location) over stored profile country.
  const effectiveCountryCode = geocodeResult.countryCode ?? user.country ?? null
  const emergencyInfo: CountryEmergencyInfo = getEmergencyInfo(effectiveCountryCode)

  const patientName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || 'QTShield Patient'
  const timestamp = alert.triggeredAt.toLocaleString('en-GB', {
    timeZone: 'Europe/Sofia',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  // Build shared context
  const mapsUrl =
    alert.latitude != null && alert.longitude != null
      ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
      : null
  const cardUrl = emergencyCard?.slug
    ? `${getAppBaseUrl()}/emergency-card/${emergencyCard.slug}`
    : null
  const qtMeds = user.medications.filter(
    (m) =>
      m.qtRisk === 'KNOWN_RISK' || m.qtRisk === 'POSSIBLE_RISK' || m.qtRisk === 'CONDITIONAL_RISK',
  )

  // Enrich alert data with geocoded address and location metadata
  const alertData: AlertData = {
    heartRate: alert.heartRate,
    hrv: alert.hrv,
    irregularRhythm: alert.irregularRhythm,
    message: alert.message,
    riskLevel: alert.riskLevel,
    stressLevel: alert.stressLevel,
    isAsleep: alert.isAsleep,
    latitude: alert.latitude,
    longitude: alert.longitude,
    address: geocodedAddress,
    accuracy: options?.locationAccuracy ?? null,
    locationCached: options?.locationCached ?? false,
  }

  // Compose messages
  const smsBody = composeSMS(patientName, user.genotype, alertData, qtMeds, mapsUrl, cardUrl, timestamp, emergencyInfo)
  const voiceMessage = composeVoiceMessage(patientName, user.genotype, alertData, qtMeds, emergencyInfo)
  const emailSubject = `EMERGENCY: QTShield SOS Alert for ${patientName}`
  const emailHtml = composeEmailHtml(
    patientName,
    user.genotype,
    alertData,
    qtMeds,
    mapsUrl,
    cardUrl,
    timestamp,
    emergencyInfo,
  )

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
        if (channel === 'EMAIL' && !contact.email) return

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
    }),
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

// ── Types ─────────────────────────────────────────────────────────────

type AlertData = {
  heartRate: number
  hrv: number
  irregularRhythm: boolean
  message: string
  riskLevel: string
  stressLevel: string
  isAsleep: boolean
  latitude: number | null
  longitude: number | null
  /** Human-readable street address from reverse geocoding. Null if unavailable. */
  address: string | null
  /** GPS accuracy in metres from browser. Null for watch-triggered alerts. */
  accuracy: number | null
  /** True when coordinates came from a localStorage cache, not a live GPS fix. */
  locationCached: boolean
}

type MedInfo = { genericName: string; brandName: string | null; qtRisk: string }

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

function formatMedsList(meds: MedInfo[]): string {
  if (meds.length === 0) return ''
  return meds
    .map((m) => {
      const name = m.brandName ? `${m.genericName} (${m.brandName})` : m.genericName
      const risk = QT_RISK_LABELS[m.qtRisk] ?? ''
      return `- ${name}${risk ? ` - ${risk}` : ''}`
    })
    .join('\n')
}

/**
 * Builds the location string for SMS.
 *
 * NOTE: Avoid emoji — they force UCS-2 encoding which cuts max SMS segment
 * length from 160 to 70 chars, causing many segments on trial accounts.
 * Use "+/-" instead of "±" for the same reason.
 */
function formatSMSLocation(alert: AlertData, mapsUrl: string | null): string {
  if (!mapsUrl) return '(Location unavailable)\n'

  const lines: string[] = []

  if (alert.address) {
    const accuracyNote = alert.locationCached
      ? ' (approx - cached location)'
      : alert.accuracy != null
        ? ` (+/-${Math.round(alert.accuracy)}m)`
        : ''
    lines.push(`Address: ${alert.address}${accuracyNote}`)
  } else {
    // No address — fall back to coords-only line with accuracy note
    const accuracyNote = alert.locationCached
      ? ' (approx - cached)'
      : alert.accuracy != null
        ? ` (+/-${Math.round(alert.accuracy)}m)`
        : ''
    lines.push(`Location${accuracyNote}: ${mapsUrl}`)
    return lines.join('\n') + '\n'
  }

  lines.push(`Map: ${mapsUrl}`)
  return lines.join('\n') + '\n'
}

// ── Message Composers ────────────────────────────────────────────────

function composeSMS(
  patientName: string,
  genotype: string | null,
  alert: AlertData,
  qtMeds: MedInfo[],
  mapsUrl: string | null,
  cardUrl: string | null,
  timestamp: string,
  emergencyInfo: CountryEmergencyInfo,
): string {
  const genotypeStr = genotype && genotype !== 'UNKNOWN' ? ` ${genotype}` : ''
  const manual = isManualSOS(alert)

  let msg = `** QTSHIELD SOS ALERT **\n\n`

  // Emergency services line — placed first so it is visible without scrolling
  msg += `CALL AMBULANCE: ${emergencyInfo.ambulance} (${emergencyInfo.countryName})`
  if (emergencyInfo.general !== emergencyInfo.ambulance) {
    msg += ` | General: ${emergencyInfo.general}`
  }
  msg += `\n\n`

  if (manual) {
    msg += `${patientName} (LQTS${genotypeStr}) has manually triggered an emergency SOS.\n\n`
  } else {
    msg += `${patientName} (LQTS${genotypeStr}) - Dangerous cardiac event detected.\n\n`
    msg += `Heart Rate: ${Math.round(alert.heartRate)} BPM\n`
    msg += `Irregular Rhythm: ${alert.irregularRhythm ? 'YES' : 'No'}\n`
    msg += `Stress: ${alert.stressLevel}\n`
    msg += `Status: ${alert.isAsleep ? 'Patient was ASLEEP' : 'Awake'}\n\n`
  }

  if (qtMeds.length > 0) {
    msg += `QT-Prolonging Medications:\n${formatMedsList(qtMeds)}\n\n`
  }

  if (genotype && GENOTYPE_TRIGGERS[genotype]) {
    msg += `WARNING: ${GENOTYPE_TRIGGERS[genotype]}\n\n`
  }

  msg += formatSMSLocation(alert, mapsUrl)
  msg += '\n'

  if (cardUrl) {
    msg += `Full Medical Profile:\n${cardUrl}\n\n`
  }

  msg += `Time: ${timestamp}\n\n`
  msg += `This is an automated emergency alert from QTShield. Please respond immediately.`

  return msg
}

/**
 * Converts a digit string to TTS-friendly spoken digits, e.g. "112" → "1 1 2".
 * Separating digits with spaces causes most TTS engines to read them individually.
 */
function spokenDigits(number: string): string {
  return number.split('').join(' ')
}

function composeVoiceMessage(
  patientName: string,
  genotype: string | null,
  alert: AlertData,
  qtMeds: MedInfo[],
  emergencyInfo: CountryEmergencyInfo,
): string {
  const manual = isManualSOS(alert)

  // Priority order: WHO → WHAT → HOW BAD → WHERE → MEDICAL CONTEXT
  // First 10 seconds must convey the critical info.

  let msg = ''

  if (manual) {
    msg += `Emergency. ${patientName} needs help now. `
    msg += `${patientName} is a Long QT Syndrome patient and has triggered an emergency alert. `
    msg += `Please call ${patientName} immediately or go to them. `
  } else {
    msg += `Emergency. ${patientName} is having a cardiac event. `
    msg += `Heart rate: ${Math.round(alert.heartRate)} beats per minute. `
    if (alert.irregularRhythm) {
      msg += `Irregular heart rhythm detected. `
    }
    if (alert.isAsleep) {
      msg += `The patient was asleep and may be unresponsive. `
    }
    msg += `Please call ${patientName} immediately or go to them. `
  }

  // Emergency services callout — audible without needing to check SMS
  msg += `If this is life-threatening, call the ambulance now: ${spokenDigits(emergencyInfo.ambulance)}. `
  msg += `That is the ambulance number for ${emergencyInfo.countryName}. `

  // Include address in voice so responders can direct emergency services without checking SMS
  if (alert.address) {
    msg += `Their location is: ${alert.address}. `
  } else {
    msg += `Check your text messages for their location and full medical profile. `
  }

  // Medical context
  if (genotype && genotype !== 'UNKNOWN') {
    msg += `${patientName} has Long QT Syndrome, genotype ${genotype}. `
  }

  if (qtMeds.length > 0) {
    const topMeds = qtMeds.slice(0, 3).map((m) => m.genericName).join(', ')
    msg += `They are taking ${topMeds}, which ${qtMeds.length > 1 ? 'affect' : 'affects'} the heart rhythm. `
  }

  if (alert.address) {
    msg += `Check your text messages for the map link and full medical profile. `
  }

  // Repeat the critical part
  msg += `Again: ${patientName} needs immediate help. Ambulance: ${spokenDigits(emergencyInfo.ambulance)}. `
  msg += `This is an automated alert from QTShield.`

  return msg
}

function composeEmailHtml(
  patientName: string,
  genotype: string | null,
  alert: AlertData,
  qtMeds: MedInfo[],
  mapsUrl: string | null,
  cardUrl: string | null,
  timestamp: string,
  emergencyInfo: CountryEmergencyInfo,
): string {
  const safeName = escapeHtml(patientName)
  const safeGenotype = genotype ? escapeHtml(genotype) : null
  const safeMessage = escapeHtml(alert.message)
  const manual = isManualSOS(alert)

  const genotypeNote =
    genotype && GENOTYPE_TRIGGERS[genotype]
      ? `<p style="margin: 8px 0 0; font-size: 13px; color: #fef2f2; opacity: 0.9;">Warning: ${escapeHtml(GENOTYPE_TRIGGERS[genotype])}</p>`
      : ''

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
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: 700; font-size: 18px;">${Math.round(alert.heartRate)} BPM</td>
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
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Stress Level</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: ${alert.stressLevel === 'HIGH' ? '#ef4444' : '#333'}; font-weight: ${alert.stressLevel === 'HIGH' ? '700' : '400'};">${escapeHtml(alert.stressLevel)}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Patient Status</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; ${alert.isAsleep ? 'color: #b45309; font-weight: 700;' : ''}">${alert.isAsleep ? 'ASLEEP — may be unresponsive' : 'Awake'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333;">Risk Level</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: 700;">${escapeHtml(alert.riskLevel)}</td>
      </tr>
      <tr>
        <td style="padding: 12px; font-weight: 600; color: #333;">Time</td>
        <td style="padding: 12px;">${escapeHtml(timestamp)}</td>
      </tr>`

  // Medications section
  const medsSection =
    qtMeds.length > 0
      ? `
    <div style="margin-top: 20px;">
      <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px;">Current QT-Prolonging Medications</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee; border-radius: 8px;">
        <tr style="background: #f9fafb;">
          <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #666;">Drug</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #666;">QT Risk</th>
        </tr>
        ${qtMeds
          .map((m) => {
            const riskColor =
              m.qtRisk === 'KNOWN_RISK' ? '#ef4444' : m.qtRisk === 'POSSIBLE_RISK' ? '#eab308' : '#f97316'
            const riskLabel = QT_RISK_LABELS[m.qtRisk] ?? m.qtRisk
            return `<tr>
              <td style="padding: 10px 12px; border-top: 1px solid #eee; font-weight: 500;">${escapeHtml(m.genericName)}${m.brandName ? ` <span style="color:#999">(${escapeHtml(m.brandName)})</span>` : ''}</td>
              <td style="padding: 10px 12px; border-top: 1px solid #eee; color: ${riskColor}; font-weight: 600; font-size: 12px;">${escapeHtml(riskLabel)}</td>
            </tr>`
          })
          .join('')}
      </table>
      <p style="margin: 8px 0 0; font-size: 12px; color: #999;">ER doctors: avoid additional QT-prolonging drugs. Check the full medical profile for details.</p>
    </div>`
      : ''

  // Location section — shows address, accuracy, and map button
  const locationSection = buildEmailLocationSection(alert, mapsUrl)

  // Emergency card button
  const cardSection = cardUrl
    ? `
    <div style="margin-top: 16px; text-align: center;">
      <a href="${escapeHtml(cardUrl)}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Full Medical Profile</a>
      <p style="margin: 8px 0 0; font-size: 12px; color: #999;">Share this link with paramedics or ER staff</p>
    </div>`
    : ''

  const generalNote =
    emergencyInfo.general !== emergencyInfo.ambulance
      ? `<p style="margin: 6px 0 0; font-size: 12px; opacity: 0.85;">General emergency: <strong>${escapeHtml(emergencyInfo.general)}</strong></p>`
      : ''

  const emergencyBanner = `
    <div style="background: #7c3aed; color: white; padding: 16px 20px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; letter-spacing: 0.05em; opacity: 0.85; font-weight: 600;">CALL AMBULANCE &mdash; ${escapeHtml(emergencyInfo.countryName)}</p>
      <p style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 0.1em;">${escapeHtml(emergencyInfo.ambulance)}</p>
      ${generalNote}
    </div>`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ef4444; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">EMERGENCY ALERT</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">QTShield SOS</p>
    ${genotypeNote}
  </div>
  <div style="border: 2px solid #ef4444; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
    ${emergencyBanner}
    <h2 style="margin: 0 0 4px; color: #1a1a1a;">${safeName}</h2>
    <p style="color: #666; margin: 0 0 20px;">Long QT Syndrome Patient${safeGenotype && safeGenotype !== 'UNKNOWN' ? ` — Genotype: <strong>${safeGenotype}</strong>` : ''}</p>

    <table style="width: 100%; border-collapse: collapse;">${vitalsRows}
    </table>

    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 20px;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">${safeMessage}</p>
    </div>

    ${medsSection}
    ${locationSection}
    ${cardSection}

    <p style="margin-top: 24px; color: #666; font-size: 13px; text-align: center;">
      This is an automated emergency alert from QTShield.<br>
      <strong>Please respond immediately and contact the patient.</strong>
    </p>
  </div>
</body>
</html>`
}

// ── Test SOS ──────────────────────────────────────────────────────────
//
// Sends real-format SOS notifications (same compose functions, same structure)
// to all emergency contacts using a realistic simulated cardiac event.
// Messages are prefixed with a [TEST] banner so recipients know it's a drill.

export type TestSOSResult = {
  notified: boolean
  contactsReached: number
  /** The exact SMS text that was sent (identical across all contacts) */
  smsText: string
  /** The exact voice script that was read aloud (identical across all contacts) */
  voiceScript: string
  /** Email subject line */
  emailSubject: string
  perContact: {
    contact: string
    phone: string
    email: string | null
    sms: { success: boolean; error?: string }
    voice: { success: boolean; error?: string }
    email_channel: { success: boolean; error?: string }
  }[]
}

export async function triggerTestSOS(userId: string): Promise<TestSOSResult> {
  const [user, contacts, emergencyCard] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        genotype: true,
        email: true,
        country: true,
        medications: {
          where: { active: true },
          select: { genericName: true, brandName: true, qtRisk: true },
          orderBy: { addedAt: 'desc' },
        },
      },
    }),
    prisma.emergencyContact.findMany({
      where: { userId },
      select: { id: true, name: true, phone: true, email: true },
    }),
    prisma.sharedEmergencyCard.findFirst({
      where: { userId },
      select: { slug: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!user) return { notified: false, contactsReached: 0, smsText: '', voiceScript: '', emailSubject: '', perContact: [] }
  if (contacts.length === 0) return { notified: false, contactsReached: 0, smsText: '', voiceScript: '', emailSubject: '', perContact: [] }

  const patientName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'HeartGuard Patient'
  const emergencyInfo = getEmergencyInfo(user.country ?? null)
  const cardUrl = emergencyCard?.slug ? `${getAppBaseUrl()}/emergency-card/${emergencyCard.slug}` : null
  const qtMeds = user.medications.filter(
    (m) => m.qtRisk === 'KNOWN_RISK' || m.qtRisk === 'POSSIBLE_RISK' || m.qtRisk === 'CONDITIONAL_RISK',
  )
  const timestamp = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/Sofia',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  // Realistic cardiac event as detected by Apple Watch
  const simulatedAlert: AlertData = {
    heartRate: 187,
    hrv: 12,
    irregularRhythm: true,
    message: 'Dangerous cardiac event detected by Apple Watch',
    riskLevel: 'ELEVATED',
    stressLevel: 'HIGH',
    isAsleep: false,
    latitude: null,
    longitude: null,
    address: null,
    accuracy: null,
    locationCached: false,
  }

  const TEST_BANNER_SMS = '[TEST — THIS IS A DRILL. No action needed.]\n\n'
  const TEST_BANNER_VOICE = 'THIS IS A TEST. No action needed. '

  const rawSms = composeSMS(patientName, user.genotype, simulatedAlert, qtMeds, null, cardUrl, timestamp, emergencyInfo)
  const rawVoice = composeVoiceMessage(patientName, user.genotype, simulatedAlert, qtMeds, emergencyInfo)
  const emailSubject = `[TEST] HeartGuard SOS Alert for ${patientName}`
  const rawEmailHtml = composeEmailHtml(patientName, user.genotype, simulatedAlert, qtMeds, null, cardUrl, timestamp, emergencyInfo)

  const smsText = TEST_BANNER_SMS + rawSms
  const voiceScript = TEST_BANNER_VOICE + rawVoice

  // Inject test banner into email HTML — insert after the opening <body> tag content
  const emailHtml = rawEmailHtml.replace(
    '<h1 style="margin: 0; font-size: 24px;">EMERGENCY ALERT</h1>',
    '<p style="margin: 0 0 8px; font-size: 13px; background: #fef9c3; color: #713f12; padding: 6px 10px; border-radius: 6px; font-weight: 700;">TEST — THIS IS A DRILL. No action needed.</p><h1 style="margin: 0; font-size: 24px;">EMERGENCY ALERT</h1>',
  )

  const perContact: TestSOSResult['perContact'] = []
  let contactsReached = 0

  await Promise.all(
    contacts.map(async (contact) => {
      const [sms, voice, email_channel] = await Promise.all([
        sendSMS(contact.phone, smsText),
        makeVoiceCall(contact.phone, voiceScript),
        contact.email
          ? sendAlertEmail(contact.email, emailSubject, emailHtml)
          : Promise.resolve({ success: false, error: 'No email configured for this contact' }),
      ])

      const reached = sms.success || voice.success || (contact.email ? email_channel.success : false)
      if (reached) contactsReached++

      perContact.push({
        contact: contact.name,
        phone: contact.phone,
        email: contact.email ?? null,
        sms,
        voice,
        email_channel,
      })
    }),
  )

  return {
    notified: contactsReached > 0,
    contactsReached,
    smsText,
    voiceScript,
    emailSubject,
    perContact,
  }
}

function buildEmailLocationSection(alert: AlertData, mapsUrl: string | null): string {
  if (!mapsUrl) {
    return `
    <div style="margin-top: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
      <p style="margin: 0; font-weight: 600; color: #6b7280;">Location unavailable</p>
      <p style="margin: 6px 0 0; font-size: 12px; color: #9ca3af;">GPS was not accessible when the alert was triggered.</p>
    </div>`
  }

  // Address line
  const addressHtml = alert.address
    ? `<p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #1a1a1a;">${escapeHtml(alert.address)}</p>`
    : ''

  // Accuracy / cache note
  let accuracyHtml = ''
  if (alert.locationCached) {
    accuracyHtml = `<p style="margin: 0 0 12px; font-size: 12px; color: #b45309; font-weight: 600;">Approximate location — cached (not a live GPS fix)</p>`
  } else if (alert.accuracy != null) {
    accuracyHtml = `<p style="margin: 0 0 12px; font-size: 12px; color: #6b7280;">GPS accuracy: &plusmn;${Math.round(alert.accuracy)} metres</p>`
  } else {
    accuracyHtml = `<p style="margin: 0 0 12px; font-size: 12px; color: #6b7280;">GPS accuracy unknown</p>`
  }

  return `
    <div style="margin-top: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #166534;">Patient Location</p>
      ${addressHtml}
      ${accuracyHtml}
      <a href="${escapeHtml(mapsUrl)}" style="display: inline-block; background: #22c55e; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open in Google Maps</a>
    </div>`
}
