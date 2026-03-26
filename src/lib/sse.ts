import type { HealthStreamEvent } from '@/types'

type SSEController = ReadableStreamDefaultController<Uint8Array>

const encoder = new TextEncoder()

/** Per-user set of active SSE connections */
const channels = new Map<string, Set<SSEController>>()

/** Auto-cleanup timers for stale connections */
const cleanupTimers = new Map<SSEController, ReturnType<typeof setTimeout>>()

/** Max idle time before auto-unsubscribe (10 minutes) */
const CONNECTION_TIMEOUT_MS = 10 * 60 * 1000

export function subscribe(userId: string, controller: SSEController): void {
  let userChannels = channels.get(userId)
  if (!userChannels) {
    userChannels = new Set()
    channels.set(userId, userChannels)
  }
  userChannels.add(controller)

  // Auto-cleanup after timeout if no activity
  resetCleanupTimer(userId, controller)
}

export function unsubscribe(userId: string, controller: SSEController): void {
  const userChannels = channels.get(userId)
  if (!userChannels) return
  userChannels.delete(controller)
  if (userChannels.size === 0) {
    channels.delete(userId)
  }

  // Clear any pending cleanup timer
  const timer = cleanupTimers.get(controller)
  if (timer) {
    clearTimeout(timer)
    cleanupTimers.delete(controller)
  }
}

export function publish(userId: string, event: HealthStreamEvent): void {
  const userChannels = channels.get(userId)
  if (!userChannels || userChannels.size === 0) return

  const serialized = JSON.stringify(event)
  // Guard against oversized events (10KB max)
  if (serialized.length > 10240) {
    console.warn(`[SSE] Event too large (${serialized.length} bytes), skipping`)
    return
  }

  const data = `event: ${event.type}\ndata: ${serialized}\n\n`
  const encoded = encoder.encode(data)

  for (const controller of userChannels) {
    try {
      controller.enqueue(encoded)
      // Reset cleanup timer on successful write
      resetCleanupTimer(userId, controller)
    } catch {
      // Controller closed — clean up
      userChannels.delete(controller)
      const timer = cleanupTimers.get(controller)
      if (timer) clearTimeout(timer)
      cleanupTimers.delete(controller)
    }
  }

  // Clean up empty channel
  if (userChannels.size === 0) {
    channels.delete(userId)
  }
}

export function hasSubscribers(userId: string): boolean {
  const userChannels = channels.get(userId)
  return userChannels !== undefined && userChannels.size > 0
}

export function getConnectionStats(): { totalConnections: number; activeUsers: number } {
  let totalConnections = 0
  for (const set of channels.values()) {
    totalConnections += set.size
  }
  return { totalConnections, activeUsers: channels.size }
}

function resetCleanupTimer(userId: string, controller: SSEController): void {
  const existing = cleanupTimers.get(controller)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    try {
      controller.close()
    } catch {
      // Already closed
    }
    unsubscribe(userId, controller)
  }, CONNECTION_TIMEOUT_MS)

  cleanupTimers.set(controller, timer)
}
