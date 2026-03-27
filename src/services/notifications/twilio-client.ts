import type Twilio from 'twilio'

let client: ReturnType<typeof Twilio> | null = null

export function getTwilioClient(): ReturnType<typeof Twilio> | null {
  if (client) return client

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    console.log('[Twilio] Not configured — skipping')
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio') as typeof Twilio
  client = twilio(accountSid, authToken)
  return client
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s\-()]/g, '')
  if (digits.startsWith('+')) return digits
  // Default to US country code if none provided
  return `+1${digits}`
}
