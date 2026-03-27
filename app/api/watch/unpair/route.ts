import { NextResponse } from 'next/server'
import { getWatchUser } from '@/lib/watch-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const user = await getWatchUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.$transaction([
    prisma.apiToken.deleteMany({ where: { userId: user.id, label: 'watch' } }),
    prisma.watchDevice.deleteMany({ where: { userId: user.id } }),
  ])

  return NextResponse.json({ ok: true })
}
