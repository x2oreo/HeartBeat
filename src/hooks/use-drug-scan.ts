'use client'

import { useState, useCallback, useRef } from 'react'
import type { ScanResult, PhotoScanResult, PipelineStep } from '@/types'

type ScanState = {
  result: ScanResult | null
  photoResult: PhotoScanResult | null
  loading: boolean
  error: string | null
  liveSteps: PipelineStep[]
}

const initialState: ScanState = {
  result: null,
  photoResult: null,
  loading: false,
  error: null,
  liveSteps: [],
}

const CLIENT_TIMEOUT_MS = 45_000
const PHOTO_CLIENT_TIMEOUT_MS = 90_000

async function readStreamResponse<T>(
  res: Response,
  signal: AbortSignal,
  timeoutMs: number,
  onStep: (step: PipelineStep) => void,
): Promise<{ type: 'result'; data: T } | { type: 'error'; error: string }> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('Streaming not supported in this browser.')

  const timeout = setTimeout(() => {
    reader.cancel()
  }, timeoutMs)

  try {
    const decoder = new TextDecoder()
    let buffer = ''
    let lastResult: { type: 'result'; data: T } | { type: 'error'; error: string } | null = null

    while (true) {
      if (signal.aborted) break
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
            | { type: 'result'; data: T }
            | { type: 'error'; error: string }

          if (msg.type === 'step') {
            onStep(msg.step)
          } else if (msg.type === 'result' || msg.type === 'error') {
            lastResult = msg
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }

    if (lastResult) return lastResult
    throw new Error('Connection lost before scan completed. Please try again.')
  } finally {
    clearTimeout(timeout)
  }
}

export function useDrugScan() {
  const [state, setState] = useState<ScanState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const scanByText = useCallback(async (drugName: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ result: null, photoResult: null, loading: true, error: null, liveSteps: [] })

    try {
      const res = await fetch('/api/scan/text/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugName }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let message = 'Scan failed. Please try again.'
        try {
          const body = JSON.parse(text)
          if (body?.error) message = body.error
        } catch {
          if (res.status === 429) message = 'Too many requests. Please wait a moment.'
          else if (res.status === 401) message = 'Session expired. Please log in again.'
        }
        throw new Error(message)
      }

      const outcome = await readStreamResponse<ScanResult>(
        res,
        controller.signal,
        CLIENT_TIMEOUT_MS,
        (step) => setState((prev) => ({ ...prev, liveSteps: [...prev.liveSteps, step] })),
      )

      if (outcome.type === 'result') {
        setState({
          result: outcome.data,
          photoResult: null,
          loading: false,
          error: null,
          liveSteps: outcome.data.pipelineTrace ?? [],
        })
      } else {
        setState((prev) => ({
          result: null,
          photoResult: null,
          loading: false,
          error: outcome.error,
          liveSteps: prev.liveSteps,
        }))
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const message = err instanceof Error ? err.message : 'Scan failed. Please try again.'
      setState((prev) => ({
        result: null,
        photoResult: null,
        loading: false,
        error: message,
        liveSteps: prev.liveSteps,
      }))
    }
  }, [])

  const scanByPhoto = useCallback(async (imageBase64: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ result: null, photoResult: null, loading: true, error: null, liveSteps: [] })

    try {
      const res = await fetch('/api/scan/photo/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let message = 'Photo scan failed. Please try again.'
        try {
          const body = JSON.parse(text)
          if (body?.error) message = body.error
        } catch {
          if (res.status === 429) message = 'Too many requests. Please wait a moment.'
          else if (res.status === 401) message = 'Session expired. Please log in again.'
          else if (res.status === 413) message = 'Image too large. Please use a smaller photo.'
        }
        throw new Error(message)
      }

      const outcome = await readStreamResponse<PhotoScanResult>(
        res,
        controller.signal,
        PHOTO_CLIENT_TIMEOUT_MS,
        (step) => setState((prev) => ({ ...prev, liveSteps: [...prev.liveSteps, step] })),
      )

      if (outcome.type === 'result') {
        setState((prev) => ({
          result: null,
          photoResult: outcome.data,
          loading: false,
          error: null,
          liveSteps: prev.liveSteps,
        }))
      } else {
        setState((prev) => ({
          result: null,
          photoResult: null,
          loading: false,
          error: outcome.error,
          liveSteps: prev.liveSteps,
        }))
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const message = err instanceof Error ? err.message : 'Photo scan failed. Please try again.'
      setState((prev) => ({
        result: null,
        photoResult: null,
        loading: false,
        error: message,
        liveSteps: prev.liveSteps,
      }))
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  return { ...state, scanByText, scanByPhoto, reset }
}
