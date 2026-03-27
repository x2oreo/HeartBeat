'use client'

import { useState, useCallback } from 'react'
import type { ScanResult, PhotoScanResult } from '@/types'

type ScanState = {
  result: ScanResult | null
  photoResult: PhotoScanResult | null
  loading: boolean
  error: string | null
}

const initialState: ScanState = {
  result: null,
  photoResult: null,
  loading: false,
  error: null,
}

export function useDrugScan() {
  const [state, setState] = useState<ScanState>(initialState)

  const scanByText = useCallback(async (drugName: string) => {
    setState({ result: null, photoResult: null, loading: true, error: null })
    try {
      const res = await fetch('/api/scan/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugName }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Scan failed. Please try again.')
      }

      const result: ScanResult = await res.json()
      setState({ result, photoResult: null, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed. Please try again.'
      setState({ result: null, photoResult: null, loading: false, error: message })
    }
  }, [])

  const scanByPhoto = useCallback(async (imageBase64: string) => {
    setState({ result: null, photoResult: null, loading: true, error: null })
    try {
      const res = await fetch('/api/scan/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Photo scan failed. Please try again.')
      }

      const photoResult: PhotoScanResult = await res.json()
      setState({ result: null, photoResult, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Photo scan failed. Please try again.'
      setState({ result: null, photoResult: null, loading: false, error: message })
    }
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return { ...state, scanByText, scanByPhoto, reset }
}
