'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChatHeader } from './ChatHeader'
import { ChatMessageList } from './ChatMessageList'
import { ChatInputBar } from './ChatInputBar'
import { WelcomeMessage } from './WelcomeMessage'
import { ConversationList } from './ConversationList'
import { useConversations } from '@/hooks/use-conversations'

export function ChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(true)
  const conversationIdRef = useRef<string | null>(null)

  const {
    conversations,
    loading: conversationsLoading,
    fetchConversations,
    deleteConversation,
    loadConversation,
  } = useConversations()

  const updateConversationId = useCallback((id: string) => {
    conversationIdRef.current = id
    setConversationId(id)
  }, [])

  // Custom fetch that captures X-Conversation-Id from response headers
  const customFetch = useCallback(async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await globalThis.fetch(input, init)
    const convId = response.headers.get('X-Conversation-Id')
    if (convId && convId !== conversationIdRef.current) {
      updateConversationId(convId)
      fetchConversations()
    }
    return response
  }, [updateConversationId, fetchConversations])

  // Transport is created once; body reads from ref at call time
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ conversationId: conversationIdRef.current }),
      fetch: customFetch,
    }),
    [customFetch],
  )

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
  } = useChat({ transport })

  const isLoading = status === 'submitted' || status === 'streaming'
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleToggleHistory = useCallback(() => setShowHistory((s) => !s), [])

  const activeTitle = useMemo(
    () => conversations.find((c) => c.id === conversationId)?.title ?? null,
    [conversations, conversationId],
  )

  const handleNewChat = useCallback(() => {
    setMessages([])
    conversationIdRef.current = null
    setConversationId(null)
    setInput('')
  }, [setMessages])

  const handleSelectConversation = useCallback(async (id: string) => {
    if (id === conversationIdRef.current) return
    const result = await loadConversation(id)
    if (!result) return
    setMessages(result.messages)
    updateConversationId(result.conversationId)
    setInput('')
  }, [loadConversation, setMessages, updateConversationId])

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id)
    if (id === conversationIdRef.current) {
      handleNewChat()
    }
  }, [deleteConversation, handleNewChat])

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    setInput('')
    await sendMessage({ text: text.trim() })
  }, [sendMessage, isLoading])

  const handleQuickAction = useCallback((text: string) => {
    handleSendMessage(text)
  }, [handleSendMessage])

  const handleImageUpload = useCallback(async (base64: string) => {
    setInput('')
    try {
      const response = await fetch('/api/scan/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error((err as { error?: string }).error ?? 'Photo scan failed')
      }

      const photoResult = await response.json() as { detectedDrugNames?: string[] }

      if (photoResult.detectedDrugNames && photoResult.detectedDrugNames.length > 0) {
        const drugList = photoResult.detectedDrugNames.join(', ')
        await sendMessage({
          text: `📸 I scanned a photo and detected: ${drugList}.\n\nPlease analyze these medications for safety.`,
        })
      } else {
        await sendMessage({
          text: '📸 I scanned a photo but couldn\'t detect any medications clearly. Could you tell me which medications are shown?',
        })
      }
    } catch (err) {
      console.error('Photo scan failed:', err)
      await sendMessage({
        text: '❌ Photo scan failed. Could you type the medication name instead?',
      })
    }
  }, [sendMessage])

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(input)
  }, [input, handleSendMessage])

  return (
    <div className="flex h-full overflow-hidden">
      {showHistory && (
        <ConversationList
          conversations={conversations}
          loading={conversationsLoading}
          activeConversationId={conversationId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onNewChat={handleNewChat}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <ChatHeader
          onNewChat={handleNewChat}
          isLoading={isLoading}
          showHistory={showHistory}
          onToggleHistory={handleToggleHistory}
          activeTitle={activeTitle}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {messages.length === 0 ? (
              <WelcomeMessage onQuickAction={handleQuickAction} />
            ) : (
              <ChatMessageList messages={messages} isLoading={isLoading} />
            )}
          </div>
        </div>

        {error && (
          <div className="mx-auto max-w-2xl px-4">
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#FF3B30]/20 bg-[#FFEDEC] px-4 py-2.5">
              <span className="text-sm text-[#C41E16]">Something went wrong.</span>
              <button
                type="button"
                onClick={() => regenerate()}
                className="text-sm font-medium text-[#FF3B30] underline hover:text-[#C41E16]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <ChatInputBar
          input={input}
          setInput={setInput}
          onSubmit={handleFormSubmit}
          onImageUpload={handleImageUpload}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
