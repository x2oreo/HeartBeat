import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Watch polls to see if its code has been claimed and a token is ready
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ status: 'invalid' }, { status: 400 })
  }

  const pairingCode = await prisma.pairingCode.findUnique({ where: { code } })

  // Code not in DB yet — web user hasn't entered it yet, keep waiting
  if (!pairingCode) {
    return NextResponse.json({ status: 'waiting' })
  }

  if (pairingCode.used) {
    return NextResponse.json({ status: 'expired' })
  }

  if (pairingCode.expiresAt < new Date()) {
    return NextResponse.json({ status: 'expired' })
  }

  if (!pairingCode.tokenForWatch) {
    return NextResponse.json({ status: 'waiting' })
  }

  // Token is ready — return it once and mark code as used
  const token = pairingCode.tokenForWatch
  await prisma.pairingCode.update({
    where: { id: pairingCode.id },
    data: { used: true, tokenForWatch: null },
  })

  return NextResponse.json({ status: 'claimed', token })
}
