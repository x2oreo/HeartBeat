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
      <PublicCardClient data={cardData} />
    </div>
  )
}
