import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scans = await prisma.scanLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      drugName: true,
      genericName: true,
      riskCategory: true,
      comboRisk: true,
      scanType: true,
      createdAt: true,
      fullResult: true,
    },
  })

  return NextResponse.json(scans)
}
