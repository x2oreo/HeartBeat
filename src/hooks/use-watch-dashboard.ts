'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WatchDashboardData } from '@/types'

type UseWatchDashboardReturn = {
  data: WatchDashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useWatchDashboard(initialData: WatchDashboardData | null = null): UseWatchDashboardReturn {
  const [data, setData] = useState<WatchDashboardData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/watch/dashboard')
      if (!res.ok) throw new Error('Failed to fetch watch dashboard data')
      const json = (await res.json()) as WatchDashboardData
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialData) {
      fetchData()
    }
  }, [initialData, fetchData])

  return { data, loading, error, refetch: fetchData }
}
