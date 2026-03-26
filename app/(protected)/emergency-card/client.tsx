'use client'

import { useState } from 'react'
import { useEmergencyCard } from '@/hooks/use-documents'
import { EmergencyCardView } from '@/components/documents/EmergencyCardView'
import { EmergencyCardPDFButton } from '@/components/documents/PDFGenerator'

export function EmergencyCardClient() {
  const { cardData, isGenerating, error, isSharing, generate, share } = useEmergencyCard()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = await share()
    if (url) setShareUrl(`${window.location.origin}${url}`)
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Emergency Card</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Generate an emergency medical card for ER doctors and paramedics.
        </p>
      </div>

      {/* Generate Button (shown when no card yet) */}
      {!cardData && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <div className="w-16 h-16 rounded-2xl bg-coral-light dark:bg-coral-deep/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-coral dark:text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Create Your Emergency Card
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-6">
            AI will generate a personalized emergency card based on your LQTS genotype, medications, and emergency contacts.
          </p>
          <button
            onClick={generate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-coral-deep hover:bg-coral text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Emergency Card
          </button>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-coral-light dark:bg-coral-deep/40 rounded-t-2xl h-20" />
            <div className="bg-coral/30 dark:bg-coral-deep/60 h-10" />
            <div className="bg-white dark:bg-neutral-900 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-2xl p-6 space-y-4">
              <div className="h-16 bg-red-50 dark:bg-red-950/30 rounded-xl" />
              <div className="space-y-3">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
                <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
                <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
                <div className="h-16 bg-green-50 dark:bg-green-950/20 rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
                <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded" />
                <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded" />
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4 animate-pulse">
            Generating your emergency card...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={generate}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Card Result */}
      {cardData && !isGenerating && (
        <>
          <EmergencyCardView data={cardData} />

          {/* Action Bar */}
          <div className="max-w-2xl mx-auto flex flex-wrap gap-3">
            <EmergencyCardPDFButton data={cardData} shareUrl={shareUrl ?? undefined} />

            <button
              onClick={handleShare}
              disabled={isSharing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 text-white dark:text-neutral-900 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {isSharing ? 'Creating link...' : 'Share Link'}
            </button>

            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>

          {/* Share URL */}
          {shareUrl && (
            <div className="max-w-2xl mx-auto bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                Shareable link created
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white dark:bg-neutral-900 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300 truncate">
                  {shareUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Anyone with this link can view the card — no login required. Share with your ER or cardiologist.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
