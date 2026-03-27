import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import type { CypData, CypConflict } from '@/types'

function detectCypConflicts(
  meds: { genericName: string; cypData: CypData | null }[],
): CypConflict[] {
  const conflicts: CypConflict[] = []
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const a = meds[i]
      const b = meds[j]
      if (!a.cypData || !b.cypData) continue

      for (const enzyme of a.cypData.inhibits) {
        if (b.cypData.metabolizedBy.includes(enzyme)) {
          conflicts.push({ medA: a.genericName, medB: b.genericName, enzyme, type: 'inhibition' })
        }
      }
      for (const enzyme of b.cypData.inhibits) {
        if (a.cypData.metabolizedBy.includes(enzyme)) {
          conflicts.push({ medA: b.genericName, medB: a.genericName, enzyme, type: 'inhibition' })
        }
      }
      for (const enzyme of a.cypData.induces) {
        if (b.cypData.metabolizedBy.includes(enzyme)) {
          conflicts.push({ medA: a.genericName, medB: b.genericName, enzyme, type: 'induction' })
        }
      }
      for (const enzyme of b.cypData.induces) {
        if (a.cypData.metabolizedBy.includes(enzyme)) {
          conflicts.push({ medA: b.genericName, medB: a.genericName, enzyme, type: 'induction' })
        }
      }
    }
  }
  return conflicts
}

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.onboarded) redirect('/onboarding')

  const [medications, recentScans, watchDevice] = await Promise.all([
    prisma.medication.findMany({
      where: { userId: user.id, active: true },
      select: { genericName: true, qtRisk: true, isDTA: true, cypData: true },
    }),
    prisma.scanLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, drugName: true, genericName: true, riskCategory: true, createdAt: true },
    }),
    prisma.watchDevice.findFirst({
      where: { userId: user.id },
      select: { id: true },
    }),
  ])

  const medsWithCyp = medications.map((m) => ({
    genericName: m.genericName,
    cypData: m.cypData as CypData | null,
  }))
  const cypConflicts = detectCypConflicts(medsWithCyp)

  const hasKnownRisk = medications.some((m) => m.qtRisk === 'KNOWN_RISK')
  const hasDTA = medications.some((m) => m.isDTA)
  const hasCypConflicts = cypConflicts.some((c) => c.type === 'inhibition')
  const qtMeds = medications.filter((m) => m.qtRisk !== 'NOT_LISTED')

  const overallRisk = hasDTA || (hasKnownRisk && hasCypConflicts)
    ? 'CRITICAL' as const
    : hasKnownRisk
      ? 'HIGH' as const
      : qtMeds.length > 0
        ? 'MODERATE' as const
        : 'LOW' as const

  // Serialize dates for client component
  const serializedScans = recentScans.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }))

  return (
    <DashboardLayout>
      <DashboardContent
        user={{ firstName: user.firstName ?? 'there', genotype: user.genotype }}
        medications={medications}
        recentScans={serializedScans}
        cypConflicts={cypConflicts}
        overallRisk={overallRisk}
        watchPaired={!!watchDevice}
      />
    </DashboardLayout>
  )
}
