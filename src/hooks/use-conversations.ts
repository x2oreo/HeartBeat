'use client'

import { useState, useCallback, useEffect } from 'react'
import type { UIMessage } from 'ai'
import type { ConversationSummary, ConversationMessage } from '@/types'

type LoadedConversation = {
  conversationId: string
  messages: UIMessage[]
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat/conversations')
      if (!res.ok) return
      const data = await res.json() as { conversations: ConversationSummary[] }
      setConversations(data.conversations)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    const res = await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' })
    if (!res.ok) await fetchConversations()
  }, [fetchConversations])

  const loadConversation = useCallback(async (id: string): Promise<LoadedConversation | null> => {
    const res = await fetch(`/api/chat/conversations/${id}`)
    if (!res.ok) return null
    const data = await res.json() as {
      conversation: { id: string; messages: ConversationMessage[] }
    }
    const messages: UIMessage[] = data.conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text' as const, text: m.content }],
    }))
    return { conversationId: data.conversation.id, messages }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  return { conversations, loading, fetchConversations, deleteConversation, loadConversation }
}
