'use client'

import { useState, useCallback } from 'react'
import { z } from 'zod'
import type { EnhancedEmergencyCardData, DoctorPrepData, PipelineStep, SavedDoctorPrepDocumentWithPreview, DoctorSpecialty, DocumentLanguage } from '@/types'

const shareResponseSchema = z.object({ slug: z.string(), url: z.string() })


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
  const [liveSteps, setLiveSteps] = useState<PipelineStep[]>([])

  const fetchDocuments = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const res = await fetch('/api/documents/doctor-prep')
      if (!res.ok) {
        setError('Failed to load documents')
        return
      }
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  const generate = useCallback(async (params: GenerateParams) => {
    setIsGenerating(true)
    setError(null)
    setLiveSteps([])
    try {
      const res = await fetch('/api/documents/doctor-prep/stream', {
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

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Streaming not supported')

      const decoder = new TextDecoder()
      let buffer = ''
      let result: DoctorPrepData | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line) as
              | { type: 'step'; step: PipelineStep }
              | { type: 'result'; data: DoctorPrepData }
              | { type: 'error'; error: string }

            if (msg.type === 'step') {
              setLiveSteps((prev) => [...prev, msg.step])
            } else if (msg.type === 'result') {
              result = msg.data
            } else if (msg.type === 'error') {
              throw new Error(msg.error)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e
          }
        }
      }

      if (!result) throw new Error('No result received from server')

      setPrepData(result)
      await fetchDocuments()
      return result
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
      if (!res.ok) {
        setError('Failed to delete document')
        return false
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      if (prepData?.id === id) setPrepData(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
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
    liveSteps,
    fetchDocuments,
    generate,
    loadDocument,
    deleteDocument,
    clearView,
  }
}
