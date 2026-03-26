import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const RISK_DOT: Record<string, string> = {
  KNOWN_RISK: 'bg-red-500',
  POSSIBLE_RISK: 'bg-yellow-500',
  CONDITIONAL_RISK: 'bg-orange-500',
  NOT_LISTED: 'bg-green-500',
}

const RISK_LABEL: Record<string, string> = {
  KNOWN_RISK: 'Known Risk',
  POSSIBLE_RISK: 'Possible Risk',
  CONDITIONAL_RISK: 'Conditional Risk',
  NOT_LISTED: 'Not Listed',
}

const RISK_TEXT_COLOR: Record<string, string> = {
  KNOWN_RISK: 'text-red-600 dark:text-red-400',
  POSSIBLE_RISK: 'text-yellow-600 dark:text-yellow-400',
  CONDITIONAL_RISK: 'text-orange-600 dark:text-orange-400',
  NOT_LISTED: 'text-green-600 dark:text-green-400',
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const scans = await prisma.scanLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      drugName: true,
      genericName: true,
      riskCategory: true,
      comboRisk: true,
      scanType: true,
      createdAt: true,
    },
  })

  return (
    <div className="p-6 max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {scans.length === 0 ? 'No scans yet' : `${scans.length} scan${scans.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {scans.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No scans yet. Check a medication to see it here.</p>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Scan Medication
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {scans.map((scan) => (
            <div key={scan.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${RISK_DOT[scan.riskCategory] ?? 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {scan.genericName || scan.drugName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${RISK_TEXT_COLOR[scan.riskCategory] ?? 'text-gray-500'}`}>
                    {RISK_LABEL[scan.riskCategory] ?? scan.riskCategory}
                  </span>
                  {scan.comboRisk && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Combo: {scan.comboRisk}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    {scan.scanType}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 shrink-0">{formatDate(scan.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
