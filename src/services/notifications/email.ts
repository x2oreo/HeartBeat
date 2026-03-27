import { Resend } from 'resend'

let resendClient: Resend | null = null

function getClient(): Resend | null {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[EMAIL] Resend not configured — skipping email')
    return null
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

export async function sendAlertEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const client = getClient()
  if (!client) return { success: false, error: 'Resend not configured' }

  const from = process.env.RESEND_FROM_EMAIL ?? 'HeartGuard Alerts <onboarding@resend.dev>'

  try {
    await client.emails.send({ from, to, subject, html })
    console.log(`[EMAIL] Sent to ${to}`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[EMAIL] Failed to send to ${to}:`, message)
    return { success: false, error: message }
  }
}
