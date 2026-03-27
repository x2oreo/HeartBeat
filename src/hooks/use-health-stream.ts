'use client'

import { useState, useEffect, useRef } from 'react'
import type { HealthMetricPayload, HealthAlertPayload, HealthStreamEvent } from '@/types'

// ── Connection status ────────────────────────────────────────────────
//
// Four distinct states to give the UI accurate copy:
//   'connecting'    — initial load, SSE opened, waiting for first 'connected' event
//   'live'          — SSE 'connected' event received; data flowing
//   'reconnecting'  — had a live connection, lost it; auto-retrying
//   'offline'       — never connected after N attempts; watch likely not paired
//
export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

type HealthStreamState = {
  latestMetric: HealthMetricPayload | null
  recentAlerts: HealthAlertPayload[]
  connectionStatus: ConnectionStatus
}

const MAX_ALERTS = 10
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000
// After this many consecutive failures with no prior success, treat watch as not paired.
const OFFLINE_ATTEMPT_THRESHOLD = 3

export function useHealthStream(): HealthStreamState {
  const [latestMetric, setLatestMetric] = useState<HealthMetricPayload | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<HealthAlertPayload[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const reconnectAttempt = useRef(0)
  const hasEverConnected = useRef(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function connect() {
      eventSourceRef.current?.close()

      const es = new EventSource('/api/watch/stream')
      eventSourceRef.current = es

      es.addEventListener('connected', () => {
        hasEverConnected.current = true
        setConnectionStatus('live')
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
        es.close()
        reconnectAttempt.current += 1

        if (hasEverConnected.current) {
          // We had a live stream before — this is a temporary drop.
          setConnectionStatus('reconnecting')
        } else if (reconnectAttempt.current >= OFFLINE_ATTEMPT_THRESHOLD) {
          // Never connected after N tries → watch is likely not paired.
          setConnectionStatus('offline')
        }
        // else: stay at 'connecting' while retrying initial handshake

        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current - 1),
          RECONNECT_MAX_MS,
        )
        reconnectTimer.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      eventSourceRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [])

  return { latestMetric, recentAlerts, connectionStatus }
}
