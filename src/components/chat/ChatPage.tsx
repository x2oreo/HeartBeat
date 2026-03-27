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
  const messageImagesRef = useRef<Map<string, string>>(new Map())
  const pendingImageRef = useRef<string | null>(null)

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

  // Custom fetch that captures X-Conversation-Id from response headers.
  // We strip the abort signal so the server finishes even if the user navigates away —
  // this ensures onFinish fires and the message gets persisted to DB.
  const customFetch = useCallback(async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const { signal: _signal, ...rest } = init ?? {}
    const response = await globalThis.fetch(input, rest)
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
  const userScrolledAway = useRef(false)

  // Track whether the user has scrolled away from the bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      if (!el) return
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      userScrolledAway.current = distanceFromBottom > 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Associate pending image with the user message once it appears
  useEffect(() => {
    if (pendingImageRef.current && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
      if (lastUserMsg && !messageImagesRef.current.has(lastUserMsg.id)) {
        messageImagesRef.current.set(lastUserMsg.id, pendingImageRef.current)
        pendingImageRef.current = null
      }
    }
  }, [messages])

  // Auto-scroll to bottom on new messages, only if user hasn't scrolled away
  useEffect(() => {
    if (scrollRef.current && !userScrolledAway.current) {
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
    pendingImageRef.current = base64
    await sendMessage({
      text: 'I took a photo of a medication. Please read the drug name(s) from the image and check if they are safe for me.',
    }, {
      body: { imageBase64: base64 },
    })
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
              <ChatMessageList messages={messages} isLoading={isLoading} messageImages={messageImagesRef.current} />
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
