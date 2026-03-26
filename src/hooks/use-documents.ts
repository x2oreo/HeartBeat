'use client'

import { useState, useCallback } from 'react'
import { z } from 'zod'
import type { EnhancedEmergencyCardData, EnhancedDoctorPrepData } from '@/types'

const shareResponseSchema = z.object({ slug: z.string(), url: z.string() })

// ── Emergency Card Hook ──────────────────────────────────────────

export function useEmergencyCard() {
  const [cardData, setCardData] = useState<EnhancedEmergencyCardData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)

  const generate = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/documents/emergency-card', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      const data: EnhancedEmergencyCardData = await res.json()
      setCardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate emergency card')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const share = useCallback(async (): Promise<string | undefined> => {
    if (!cardData) return
    setIsSharing(true)
    setError(null)
    try {
      const res = await fetch('/api/documents/emergency-card/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      const { url } = shareResponseSchema.parse(await res.json())
      return url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link')
      return undefined
    } finally {
      setIsSharing(false)
    }
  }, [cardData])

  return { cardData, isGenerating, error, isSharing, generate, share }
}

// ── Doctor Prep Hook ─────────────────────────────────────────────

export function useDoctorPrep() {
  const [prepData, setPrepData] = useState<EnhancedDoctorPrepData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (procedureType?: string | null) => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/documents/doctor-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedureType: procedureType ?? null }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      const data: EnhancedDoctorPrepData = await res.json()
      setPrepData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate doctor prep')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { prepData, isGenerating, error, generate }
}
