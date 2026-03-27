'use client'

import { useMemo } from 'react'
import type { ConversationSummary } from '@/types'

type Group = {
  label: string
  items: ConversationSummary[]
}

function groupByTime(conversations: ConversationSummary[]): Group[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const today: ConversationSummary[] = []
  const yesterday: ConversationSummary[] = []
  const earlier: ConversationSummary[] = []

  for (const c of conversations) {
    const d = new Date(c.updatedAt)
    if (d >= todayStart) today.push(c)
    else if (d >= yesterdayStart) yesterday.push(c)
    else earlier.push(c)
  }

  const groups: Group[] = []
  if (today.length > 0) groups.push({ label: 'Today', items: today })
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday })
  if (earlier.length > 0) groups.push({ label: 'Earlier', items: earlier })
  return groups
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ConversationList({
  conversations,
  loading,
  activeConversationId,
  onSelect,
  onDelete,
  onNewChat,
}: {
  conversations: ConversationSummary[]
  loading: boolean
  activeConversationId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNewChat: () => void
}) {
  const groups = useMemo(() => groupByTime(conversations), [conversations])

  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-separator-light bg-surface-raised overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-separator-light">
        <span className="text-[13px] font-semibold text-text-primary">Chats</span>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
          aria-label="New conversation"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && conversations.length === 0 ? (
          <div className="space-y-1 px-2 py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 rounded-xl bg-separator-light/50 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-[12px] text-text-tertiary">No conversations yet</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.items.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative mx-1 flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 transition-colors ${
                    conv.id === activeConversationId
                      ? 'bg-brand-light'
                      : 'hover:bg-surface'
                  }`}
                  onClick={() => onSelect(conv.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-medium leading-snug ${
                      conv.id === activeConversationId ? 'text-text-primary' : 'text-text-secondary'
                    }`}>
                      {conv.title}
                    </p>
                    <p className="text-[11px] text-text-tertiary leading-tight mt-0.5">
                      {formatRelativeTime(conv.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 transition-all hover:bg-separator-light hover:text-text-secondary group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
