'use client'

export function ChatHeader({ onNewChat, isLoading }: {
  onNewChat: () => void
  isLoading: boolean
}) {
  return (
    <div className="flex items-center gap-3 border-b border-separator-light bg-surface-raised px-4 py-3">
      {/* Agent avatar */}
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="text-[15px] font-semibold text-text-primary">HeartGuard AI</h1>
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${isLoading ? 'bg-brand animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[11px] text-text-tertiary">
            {isLoading ? 'Analyzing...' : 'Ready to help'}
          </span>
        </div>
      </div>

      {/* New chat button */}
      <button
        type="button"
        onClick={onNewChat}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
        aria-label="New conversation"
      >
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      </button>
    </div>
  )
}
