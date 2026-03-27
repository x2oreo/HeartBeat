import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST — Watch registers its own pairing code (no auth required)
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim() : null

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'code must be a 6-digit number' }, { status: 400 })
  }

  // Delete any existing unclaimed codes with the same value
  await prisma.pairingCode.deleteMany({ where: { code, used: false, userId: null } })

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  await prisma.pairingCode.create({
    data: { code, expiresAt },
  })

  return NextResponse.json({ ok: true, expiresInSeconds: 300 })
}
