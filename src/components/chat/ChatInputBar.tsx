'use client'

import { useRef, useCallback } from 'react'

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return reject(new Error('Failed to read file'))
      const base64 = result.split(',')[1]
      if (!base64) return reject(new Error('Empty file'))
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function ChatInputBar({ input, setInput, onSubmit, onImageUpload, isLoading }: {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onImageUpload: (base64: string) => void
  isLoading: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = document.getElementById('chat-form') as HTMLFormElement
      form?.requestSubmit()
    }
  }, [])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [setInput])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await readFileAsBase64(file)
      onImageUpload(base64)
    } catch {
      console.error('Failed to read image')
    }
    e.target.value = ''
  }, [onImageUpload])

  return (
    <div className="shrink-0 border-t border-separator-light bg-surface-raised pb-[env(safe-area-inset-bottom)]">
      <form
        id="chat-form"
        onSubmit={onSubmit}
        className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3"
      >
        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-separator text-text-tertiary transition-colors hover:bg-surface hover:border-brand hover:text-brand disabled:opacity-40"
          aria-label="Upload medication photo"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a medication..."
            rows={1}
            disabled={isLoading}
            className="w-full resize-none rounded-xl border-[1.5px] border-separator bg-surface-raised px-4 py-2.5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-60"
            style={{ maxHeight: '160px' }}
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}
