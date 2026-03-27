'use client'

import Link from 'next/link'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { QuickActionsGrid } from './QuickActionsGrid'
import { HealthMonitorCompact } from './HealthMonitorCompact'
import { SOSButton } from './HealthMonitor'
import { MedicationRiskChart } from './MedicationRiskChart'
import { ScanActivityChart } from './ScanActivityChart'
import type { CypConflict } from '@/types'

type DashboardContentProps = {
  user: {
    firstName: string
    genotype: string | null
  }
  medications: { genericName: string; qtRisk: string; isDTA: boolean; cypData: unknown }[]
  recentScans: {
    id: string
    drugName: string
    genericName: string
    riskCategory: string
    createdAt: string
  }[]
  cypConflicts: CypConflict[]
  overallRisk: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
  watchPaired: boolean
}

const GENOTYPE_COLORS: Record<string, string> = {
  LQT1: 'bg-brand-light text-brand-deep',
  LQT2: 'bg-coral-light text-coral-deep',
  LQT3: 'bg-teal-light text-teal',
  OTHER: 'bg-surface text-text-secondary',
  UNKNOWN: 'bg-surface text-text-secondary',
}

const RISK_DOT: Record<string, string> = {
  KNOWN_RISK: 'bg-risk-danger',
  POSSIBLE_RISK: 'bg-risk-caution',
  CONDITIONAL_RISK: 'bg-risk-caution',
  NOT_LISTED: 'bg-risk-safe',
}

const riskConfig = {
  CRITICAL: { color: 'bg-risk-danger-bg border-risk-danger/20', text: 'text-risk-danger-text', dot: 'bg-risk-danger', label: 'Critical Risk' },
  HIGH: { color: 'bg-risk-danger-bg border-risk-danger/20', text: 'text-risk-danger-text', dot: 'bg-risk-danger', label: 'High Risk' },
  MODERATE: { color: 'bg-risk-caution-bg border-risk-caution/20', text: 'text-risk-caution-text', dot: 'bg-risk-caution', label: 'Moderate Risk' },
  LOW: { color: 'bg-risk-safe-bg border-risk-safe/20', text: 'text-risk-safe-text', dot: 'bg-risk-safe', label: 'Low Risk' },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
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

export function DashboardContent({
  user,
  medications,
  recentScans,
  cypConflicts,
  overallRisk,
  watchPaired,
}: DashboardContentProps) {
  const { stats, loading } = useDashboardStats()
  const risk = riskConfig[overallRisk]
  const totalMeds = medications.length
  const qtMeds = medications.filter((m) => m.qtRisk !== 'NOT_LISTED')
  const dtaMeds = medications.filter((m) => m.isDTA)

  return (
    <div className="px-3 py-5 md:px-4 md:py-8 max-w-2xl mx-auto space-y-5">
      {/* Welcome */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-sm text-text-secondary">Welcome back</p>
          <h1 className="text-2xl font-bold text-text-primary">{user.firstName}</h1>
        </div>
        {user.genotype && (
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${GENOTYPE_COLORS[user.genotype] ?? GENOTYPE_COLORS.UNKNOWN}`}>
            {user.genotype}
          </span>
        )}
      </div>

      {/* Risk Summary Card */}
      {totalMeds > 0 && (
        <div className={`rounded-2xl border-2 p-4 animate-fade-in-up ${risk.color}`} style={{ animationDelay: '60ms' }}>
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

      {/* SOS */}
      <div className="flex items-center justify-between rounded-2xl bg-surface-raised card-shadow px-5 py-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        <div>
          <p className="text-sm font-semibold text-text-primary">Emergency Alert</p>
          <p className="text-xs text-text-secondary mt-0.5">Notify all emergency contacts instantly</p>
        </div>
        <SOSButton />
      </div>

      {/* Quick Actions */}
      <QuickActionsGrid />

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthMonitorCompact
          heartRateHistory={stats?.heartRateHistory ?? []}
          watchPaired={watchPaired}
        />
        <MedicationRiskChart
          medications={medications}
          cypConflictCount={cypConflicts.length}
        />
      </div>

      {/* Scan Activity */}
      <ScanActivityChart
        scanActivity={stats?.scanActivity ?? []}
        loading={loading}
      />

      {/* Recent Scans */}
      <div className="bg-surface-raised rounded-2xl overflow-hidden card-shadow animate-fade-in-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="font-semibold text-text-primary">Recent Medicine Scans</p>
          <Link href="/history" className="text-sm text-brand hover:underline">View all</Link>
        </div>
        {recentScans.length === 0 ? (
          <div className="px-5 pb-5 text-center">
            <p className="text-sm text-text-secondary">No medicine scans yet. Tap Scan Medication to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-separator-light">
            {recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${RISK_DOT[scan.riskCategory] ?? 'bg-text-tertiary'}`} />
                <p className="font-medium text-text-primary truncate flex-1">{scan.genericName || scan.drugName}</p>
                <p className="text-xs text-text-tertiary shrink-0">{formatDate(scan.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CYP Conflict Matrix */}
      {cypConflicts.length > 0 && (
        <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-risk-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="font-semibold text-text-primary text-sm">CYP450 Drug Interactions</p>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Detected enzyme conflicts between your current medications (computed locally, no AI)
          </p>
          <div className="space-y-2">
            {cypConflicts.map((conflict, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  conflict.type === 'inhibition' ? 'bg-risk-danger-bg' : 'bg-risk-caution-bg'
                }`}
              >
                <span className={`shrink-0 mt-0.5 font-bold text-xs ${
                  conflict.type === 'inhibition' ? 'text-risk-danger' : 'text-risk-caution'
                }`}>
                  {conflict.type === 'inhibition' ? '!!' : '!'}
                </span>
                <div>
                  <p className={`font-medium ${
                    conflict.type === 'inhibition' ? 'text-risk-danger-text' : 'text-risk-caution-text'
                  }`}>
                    <span className="font-semibold">{conflict.medA}</span>
                    {conflict.type === 'inhibition' ? ' inhibits ' : ' induces '}
                    <span className="font-mono text-xs">{conflict.enzyme}</span>
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    conflict.type === 'inhibition' ? 'text-risk-danger-text' : 'text-risk-caution-text'
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

      {/* Data Sources */}
      <div className="bg-surface-raised rounded-2xl card-shadow p-5 animate-fade-in-up">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
          Verification Sources
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Local DB (111 drugs)
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-risk-safe-bg px-2.5 py-1 text-xs font-medium text-risk-safe-text">
            <span className="w-1.5 h-1.5 rounded-full bg-risk-safe" />
            CredibleMeds
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-coral-light px-2.5 py-1 text-xs font-medium text-coral-deep">
            <span className="w-1.5 h-1.5 rounded-full bg-coral" />
            FDA FAERS
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-risk-caution-bg px-2.5 py-1 text-xs font-medium text-risk-caution-text">
            <span className="w-1.5 h-1.5 rounded-full bg-risk-caution" />
            RxNorm
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
            CYP450 Analysis
          </span>
        </div>
      </div>
    </div>
  )
}
