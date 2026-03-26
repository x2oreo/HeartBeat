import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/DashboardLayout'

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

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.onboarded) redirect('/onboarding')

  const [medications, recentScans] = await Promise.all([
    prisma.medication.findMany({
      where: { userId: user.id, active: true },
      select: { qtRisk: true },
    }),
    prisma.scanLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, drugName: true, genericName: true, riskCategory: true, createdAt: true },
    }),
  ])

  const totalMeds = medications.length
  const qtMeds = medications.filter((m) => m.qtRisk !== 'NOT_LISTED').length
  const firstName = user.name?.split(' ')[0] ?? 'there'

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
                  {qtMeds > 0 && <span className="text-red-600 dark:text-red-400 ml-1">· {qtMeds} QT-prolonging</span>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {qtMeds > 0 && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
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

      </div>
    </DashboardLayout>
  )
}
