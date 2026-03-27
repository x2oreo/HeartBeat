'use client'

import type { UIMessage } from 'ai'
import { ChatMessage } from './ChatMessage'

export function ChatMessageList({ messages, isLoading }: {
  messages: UIMessage[]
  isLoading: boolean
}) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
        <ThinkingIndicator />
      )}
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand mt-0.5">
        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-surface-raised px-4 py-4 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          <span className="text-[13px] font-semibold text-text-primary">Analyzing your request...</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 animate-step-reveal">
            <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-text-primary font-medium">Processing...</span>
          </div>
        </div>
        <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-brand/20 via-brand/40 to-brand/20 animate-pulse" />
      </div>
    </div>
  )
}
