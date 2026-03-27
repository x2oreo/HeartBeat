import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes, createHash } from 'node:crypto'

const TOKEN_TTL_DAYS = 90

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex')
}

// POST — Web user claims a code shown on the watch
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim() : null

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'code must be a 6-digit number' }, { status: 400 })
  }

  // Check for existing code — if not found, create it (watch doesn't pre-register)
  let pairingCode = await prisma.pairingCode.findUnique({ where: { code } })

  if (pairingCode) {
    if (pairingCode.used) return NextResponse.json({ error: 'Code already used' }, { status: 400 })
    if (pairingCode.userId !== null) return NextResponse.json({ error: 'Code already claimed' }, { status: 400 })
    if (pairingCode.expiresAt < new Date()) return NextResponse.json({ error: 'Code expired' }, { status: 400 })
  } else {
    // Watch just showed the code without pre-registering — create it now
    pairingCode = await prisma.pairingCode.create({
      data: { code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    })
  }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = sha256(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction(async (tx) => {
    await tx.apiToken.deleteMany({ where: { userId: user.id, label: 'watch' } })

    await tx.apiToken.create({
      data: { userId: user.id, tokenHash, label: 'watch', expiresAt },
    })

    await tx.watchDevice.upsert({
      where: { userId: user.id },
      update: { lastSeen: new Date() },
      create: { userId: user.id, lastSeen: new Date() },
    })

    await tx.pairingCode.update({
      where: { id: pairingCode.id },
      data: { userId: user.id, tokenForWatch: rawToken },
    })
  })

  return NextResponse.json({ ok: true })
}
