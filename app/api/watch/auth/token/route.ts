import { NextResponse } from 'next/server'
import { exchangePairingCode } from '@/lib/watch-auth'
import { z } from 'zod'

const bodySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
})

// Rate limit: max 5 attempts per IP per 5 minutes
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const RATE_LIMIT_MAX = 5
const attempts = new Map<string, number[]>()

function checkPairingRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (attempts.get(ip) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= RATE_LIMIT_MAX) {
    attempts.set(ip, timestamps)
    return false
  }

  timestamps.push(now)
  attempts.set(ip, timestamps)
  return true
}

export async function POST(request: Request) {
  try {
    // Rate limit by IP to prevent brute-force of 6-digit codes
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkPairingRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many pairing attempts. Try again in 5 minutes.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid pairing code format' },
        { status: 400 }
      )
    }

    const result = await exchangePairingCode(parsed.data.code)

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired pairing code' },
        { status: 401 }
      )
    }

    return NextResponse.json({ token: result.token })
  } catch {
    return NextResponse.json(
      { error: 'Failed to exchange pairing code' },
      { status: 500 }
    )
  }
}
