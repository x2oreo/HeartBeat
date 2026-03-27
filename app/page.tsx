import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/DashboardLayout'
import type { CypData } from '@/types'

const GENOTYPE_COLORS: Record<string, string> = {
  LQT1: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  LQT2: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  LQT3: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  UNKNOWN: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const RISK_DOT: Record<string, string> = {
  KNOWN_RISK: 'bg-red-500',
  POSSIBLE_RISK: 'bg-yellow-500',
  CONDITIONAL_RISK: 'bg-orange-500',
  NOT_LISTED: 'bg-green-500',
}

function formatDate(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type CypConflict = {
  medA: string
  medB: string
  enzyme: string
  type: 'inhibition' | 'induction'
}

function detectCypConflicts(
  meds: { genericName: string; cypData: CypData | null }[],
): CypConflict[] {
  const conflicts: CypConflict[] = []
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const a = meds[i]
      const b = meds[j]
      if (!a.cypData || !b.cypData) continue

      // A inhibits enzyme that B is metabolized by
      for (const enzyme of a.cypData.inhibits) {
        if (b.cypData.metabolizedBy.includes(enzyme)) {
          conflicts.push({ medA: a.genericName, medB: b.genericName, enzyme, type: 'inhibition' })
        }
      }
      // B inhibits enzyme that A is metabolized by
      for (const enzyme of b.cypData.inhibits) {
        if (a.cypData.metabolizedBy.includes(enzyme)) {
          conflicts.push({ medA: b.genericName, medB: a.genericName, enzyme, type: 'inhibition' })
        }
      }
      // A induces enzyme that B is metabolized by
      for (const enzyme of a.cypData.induces) {
        if (b.cypData.metabolizedBy.includes(enzyme)) {
          conflicts.push({ medA: a.genericName, medB: b.genericName, enzyme, type: 'induction' })
        }
      }
      // B induces enzyme that A is metabolized by
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

  const [medications, recentScans] = await Promise.all([
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
  ])

  const totalMeds = medications.length
  const qtMeds = medications.filter((m) => m.qtRisk !== 'NOT_LISTED')
  const dtaMeds = medications.filter((m) => m.isDTA)
  const firstName = user.first_name ?? 'there'

  // CYP conflict detection (pure computation, no AI)
  const medsWithCyp = medications.map((m) => ({
    genericName: m.genericName,
    cypData: m.cypData as CypData | null,
  }))
  const cypConflicts = detectCypConflicts(medsWithCyp)

  // Determine overall risk level
  const hasKnownRisk = medications.some((m) => m.qtRisk === 'KNOWN_RISK')
  const hasDTA = dtaMeds.length > 0
  const hasCypConflicts = cypConflicts.some((c) => c.type === 'inhibition')
  const overallRisk = hasDTA || (hasKnownRisk && hasCypConflicts)
    ? 'CRITICAL'
    : hasKnownRisk
      ? 'HIGH'
      : qtMeds.length > 0
        ? 'MODERATE'
        : 'LOW'

  const riskConfig = {
    CRITICAL: { color: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', label: 'Critical Risk' },
    HIGH: { color: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500', label: 'High Risk' },
    MODERATE: { color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', label: 'Moderate Risk' },
    LOW: { color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Low Risk' },
  }
  const risk = riskConfig[overallRisk]

  return (
    <DashboardLayout email={user.email}>
      <div className="p-6 max-w-lg space-y-5">

        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{firstName}</h1>
          </div>
          {user.genotype && (
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${GENOTYPE_COLORS[user.genotype] ?? GENOTYPE_COLORS.UNKNOWN}`}>
              {user.genotype}
            </span>
          )}
        </div>

        {/* Risk Summary Card */}
        {totalMeds > 0 && (
          <div className={`rounded-2xl border-2 p-4 ${risk.color}`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${risk.dot} shrink-0`} />
              <div>
                <p className={`font-semibold ${risk.text}`}>{risk.label}</p>
                <p className={`text-sm mt-0.5 ${risk.text} opacity-80`}>
                  {totalMeds} medication{totalMeds !== 1 ? 's' : ''}
                  {qtMeds.length > 0 && ` · ${qtMeds.length} QT-prolonging`}
                  {dtaMeds.length > 0 && ` · ${dtaMeds.length} DTA`}
                  {cypConflicts.length > 0 && ` · ${cypConflicts.length} CYP conflict${cypConflicts.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scan Button */}
        <Link
          href="/scan"
          className="block w-full py-5 rounded-2xl bg-brand hover:bg-brand-deep active:bg-brand-dark text-white text-center transition-colors shadow-lg shadow-brand-light dark:shadow-brand-dark"
        >
          <div className="flex items-center justify-center gap-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="text-lg font-bold">Scan Medication</span>
          </div>
          <p className="text-white/80 text-sm mt-1">Check any drug for QT risk</p>
        </Link>

        {/* CYP Conflict Matrix */}
        {cypConflicts.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">CYP450 Drug Interactions</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Detected enzyme conflicts between your current medications (computed locally, no AI)
            </p>
            <div className="space-y-2">
              {cypConflicts.map((conflict, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                    conflict.type === 'inhibition'
                      ? 'bg-red-50 dark:bg-red-950/30'
                      : 'bg-amber-50 dark:bg-amber-950/30'
                  }`}
                >
                  <span className={`shrink-0 mt-0.5 font-bold text-xs ${
                    conflict.type === 'inhibition' ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {conflict.type === 'inhibition' ? '!!' : '!'}
                  </span>
                  <div>
                    <p className={`font-medium ${
                      conflict.type === 'inhibition'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      <span className="font-semibold">{conflict.medA}</span>
                      {conflict.type === 'inhibition' ? ' inhibits ' : ' induces '}
                      <span className="font-mono text-xs">{conflict.enzyme}</span>
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      conflict.type === 'inhibition'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {conflict.type === 'inhibition'
                        ? `May increase ${conflict.medB} plasma levels → amplified QT effect`
                        : `May decrease ${conflict.medB} plasma levels`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medication Summary */}
        <Link
          href="/medications"
          className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-brand dark:hover:border-brand-deep transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">My Medications</p>
              {totalMeds === 0 ? (
                <p className="font-semibold text-gray-900 dark:text-white">No medications added</p>
              ) : (
                <p className="font-semibold text-gray-900 dark:text-white">
                  {totalMeds} medication{totalMeds !== 1 ? 's' : ''}
                  {qtMeds.length > 0 && <span className="text-red-600 dark:text-red-400 ml-1">· {qtMeds.length} QT-prolonging</span>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {qtMeds.length > 0 && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Recent Scans */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="font-semibold text-gray-900 dark:text-white">Recent Scans</p>
            <Link href="/history" className="text-sm text-brand dark:text-brand hover:underline">View all</Link>
          </div>
          {recentScans.length === 0 ? (
            <div className="px-4 pb-5 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No scans yet. Tap Scan Medication to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${RISK_DOT[scan.riskCategory] ?? 'bg-gray-400'}`} />
                  <p className="font-medium text-gray-900 dark:text-white truncate flex-1">{scan.genericName || scan.drugName}</p>
                  <p className="text-xs text-gray-400 shrink-0">{formatDate(scan.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Sources */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Verification Sources
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Local DB (111 drugs)
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              CredibleMeds
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              FDA FAERS
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              RxNorm
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              CYP450 Analysis
            </span>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
