'use client'

import { useState, useCallback } from 'react'
import { z } from 'zod'
import type { EnhancedEmergencyCardData, DoctorPrepData, SavedDoctorPrepDocumentWithPreview, DoctorSpecialty, DocumentLanguage } from '@/types'

const shareResponseSchema = z.object({ slug: z.string(), url: z.string() })

// ── Emergency Card Hook ──────────────────────────────────────────

export function useEmergencyCard() {
  const [cardData, setCardData] = useState<EnhancedEmergencyCardData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)

  const generate = useCallback(async (extras?: {
    patientPhoto?: string
    personalNotes?: { en: string; bg: string }
  }) => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/documents/emergency-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extras ?? {}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      const data: EnhancedEmergencyCardData = await res.json()
      setCardData(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate emergency card')
      return undefined
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const share = useCallback(async (data?: EnhancedEmergencyCardData): Promise<string | undefined> => {
    const toShare = data ?? cardData
    if (!toShare) return
    setIsSharing(true)
    setError(null)
    try {
      const res = await fetch('/api/documents/emergency-card/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toShare),
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

  const loadExisting = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/emergency-card')
      if (res.status === 404) return null
      if (!res.ok) return null
      const data: EnhancedEmergencyCardData = await res.json()
      setCardData(data)
      return data
    } catch {
      return null
    }
  }, [])

  return { cardData, setCardData, isGenerating, error, isSharing, generate, share, loadExisting }
}

// ── Doctor Prep Hook ─────────────────────────────────────────────

type GenerateParams = {
  doctorSpecialty: DoctorSpecialty
  customSpecialty?: string | null
  language: DocumentLanguage
  customLanguage?: string | null
}

export function useDoctorPrep() {
  const [documents, setDocuments] = useState<SavedDoctorPrepDocumentWithPreview[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [prepData, setPrepData] = useState<DoctorPrepData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const res = await fetch('/api/documents/doctor-prep')
      if (!res.ok) return
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch {
      // silently fail — dashboard will show empty
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  const generate = useCallback(async (params: GenerateParams) => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/documents/doctor-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorSpecialty: params.doctorSpecialty,
          customSpecialty: params.customSpecialty ?? null,
          language: params.language,
          customLanguage: params.customLanguage ?? null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      const data: DoctorPrepData = await res.json()
      setPrepData(data)
      // Refresh the document list
      await fetchDocuments()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate doctor prep')
      return undefined
    } finally {
      setIsGenerating(false)
    }
  }, [fetchDocuments])

  const loadDocument = useCallback(async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/documents/doctor-prep/${id}`)
      if (!res.ok) {
        throw new Error('Failed to load document')
      }
      const data: DoctorPrepData = await res.json()
      setPrepData(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
      return undefined
    }
  }, [])

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/documents/doctor-prep/${id}`, { method: 'DELETE' })
      if (!res.ok) return false
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      if (prepData?.id === id) setPrepData(null)
      return true
    } catch {
      return false
    }
  }, [prepData])

  const clearView = useCallback(() => setPrepData(null), [])

  return {
    documents,
    isLoadingList,
    prepData,
    isGenerating,
    error,
    fetchDocuments,
    generate,
    loadDocument,
    deleteDocument,
    clearView,
  }
}
