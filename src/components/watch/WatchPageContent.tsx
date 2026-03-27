'use client'

import { WatchPairingFlow } from './WatchPairingFlow'
import { WatchDashboard } from './WatchDashboard'
import type { WatchDashboardData } from '@/types'

type WatchPageContentProps = {
  paired: boolean
  initialData: WatchDashboardData | null
}

export function WatchPageContent({ paired, initialData }: WatchPageContentProps) {
  if (!paired || !initialData) {
    return <WatchPairingFlow />
  }

  return <WatchDashboard initialData={initialData} />
}
