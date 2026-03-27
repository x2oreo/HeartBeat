import { getTwilioClient, normalizePhone } from './twilio-client'

function buildTwiml(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return `<Response><Say voice="alice">${escaped}</Say><Pause length="2"/><Say voice="alice">${escaped}</Say></Response>`
}

export async function makeVoiceCall(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const client = getTwilioClient()
  if (!client) return { success: false, error: 'Twilio not configured' }

  const from = process.env.TWILIO_PHONE_NUMBER
  if (!from) return { success: false, error: 'TWILIO_PHONE_NUMBER not set' }

  try {
    await client.calls.create({
      to: normalizePhone(to),
      from,
      twiml: buildTwiml(message),
    })
    console.log(`[VOICE] Call initiated to ${to}`)
    return { success: true }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[VOICE] Failed to call ${to}:`, errMsg)
    return { success: false, error: errMsg }
  }
}
