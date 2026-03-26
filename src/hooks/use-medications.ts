'use client'

import { useState, useCallback, useEffect } from 'react'
import type { RiskCategory } from '@/types'

export type Medication = {
  id: string
  genericName: string
  brandName: string | null
  dosage: string | null
  qtRisk: RiskCategory
  isDTA: boolean
  addedAt: string
}

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMedications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/medications')
      if (!res.ok) throw new Error('Failed to load medications')
      const data: Medication[] = await res.json()
      setMedications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  const addMedication = useCallback(async (drugName: string) => {
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugName }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error ?? 'Failed to add medication')
    }
    await fetchMedications()
  }, [fetchMedications])

  const removeMedication = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/medications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId: id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Failed to remove medication')
      }
      setMedications((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      await fetchMedications()
      throw err
    }
  }, [fetchMedications])

  useEffect(() => {
    fetchMedications()
  }, [fetchMedications])

  return { medications, loading, error, fetchMedications, addMedication, removeMedication }
}
