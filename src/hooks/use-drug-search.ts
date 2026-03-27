'use client'

import { useState, useEffect, useRef } from 'react'
import type { AutocompleteSuggestion } from '@/types'

export type DrugSuggestion = AutocompleteSuggestion

export function useDrugSearch(debounceMs = 300) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      try {
        const res = await fetch(
          `/api/drugs/autocomplete?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        )
        if (res.ok) {
          const data: DrugSuggestion[] = await res.json()
          setSuggestions(data)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timeout)
      abortRef.current?.abort()
    }
  }, [query, debounceMs])

  return { query, setQuery, suggestions, loading }
}
