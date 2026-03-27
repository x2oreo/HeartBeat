import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ── GET /api/chat/conversations ─────────────────────────────────────────
// List all conversations for the current user, newest first.

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  const result = conversations.map((c) => ({
    id: c.id,
    title: c.title ?? 'New conversation',
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messageCount: c._count.messages,
  }))

  return NextResponse.json({ conversations: result })
}
