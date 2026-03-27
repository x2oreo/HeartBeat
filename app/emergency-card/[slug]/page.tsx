import { notFound } from 'next/navigation'
import { getSharedEmergencyCard } from '@/services/document-generator'
import { PublicCardClient } from './client'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function PublicEmergencyCardPage({ params }: Props) {
  const { slug } = await params
  const cardData = await getSharedEmergencyCard(slug)

  if (!cardData) {
    notFound()
  }

  return (
    <div
      className="min-h-screen bg-surface"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Top Bar */}
      <header className="bg-surface-raised/80 backdrop-blur-lg border-b border-separator-light px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-coral-deep flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-text-primary">HeartGuard</span>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-5">
        <PublicCardClient data={cardData} />
      </main>
    </div>
  )
}
