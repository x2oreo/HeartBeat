import { getTwilioClient, normalizePhone } from './twilio-client'

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const client = getTwilioClient()
  if (!client) return { success: false, error: 'Twilio not configured' }

  const from = process.env.TWILIO_PHONE_NUMBER
  if (!from) return { success: false, error: 'TWILIO_PHONE_NUMBER not set' }

  try {
    await client.messages.create({
      to: normalizePhone(to),
      from,
      body,
    })
    console.log(`[SMS] Sent to ${to}`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[SMS] Failed to send to ${to}:`, message)
    return { success: false, error: message }
  }
}
