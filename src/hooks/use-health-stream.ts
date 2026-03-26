'use client'

import { useState, useEffect, useRef } from 'react'
import type { HealthMetricPayload, HealthAlertPayload, HealthStreamEvent } from '@/types'

type HealthStreamState = {
  latestMetric: HealthMetricPayload | null
  recentAlerts: HealthAlertPayload[]
  isConnected: boolean
}

const MAX_ALERTS = 10
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

export function useHealthStream(): HealthStreamState {
  const [latestMetric, setLatestMetric] = useState<HealthMetricPayload | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<HealthAlertPayload[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const reconnectAttempt = useRef(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function connect() {
      // Clean up any existing connection
      eventSourceRef.current?.close()

      const es = new EventSource('/api/watch/stream')
      eventSourceRef.current = es

      es.addEventListener('connected', () => {
        setIsConnected(true)
        reconnectAttempt.current = 0
      })

      es.addEventListener('health-update', (event) => {
        try {
          const parsed = JSON.parse(event.data) as HealthStreamEvent
          if (parsed.data && parsed.type === 'health-update') {
            setLatestMetric(parsed.data as HealthMetricPayload)
          }
        } catch {
          // Ignore malformed events
        }
      })

      es.addEventListener('alert', (event) => {
        try {
          const parsed = JSON.parse(event.data) as HealthStreamEvent
          if (parsed.data && parsed.type === 'alert') {
            setRecentAlerts((prev) => [
              parsed.data as HealthAlertPayload,
              ...prev.slice(0, MAX_ALERTS - 1),
            ])
          }
        } catch {
          // Ignore malformed events
        }
      })

      es.onerror = () => {
        setIsConnected(false)
        es.close()

        // Exponential backoff reconnection
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current),
          RECONNECT_MAX_MS
        )
        reconnectAttempt.current += 1
        reconnectTimer.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      eventSourceRef.current?.close()
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
    }
  }, [])

  return { latestMetric, recentAlerts, isConnected }
}
