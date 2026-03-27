import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// ── GET /api/chat/conversations/[id] ────────────────────────────────────
// Load a full conversation with all messages.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        select: {
          id: true,
          role: true,
          content: true,
          toolData: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  return NextResponse.json({ conversation })
}

// ── DELETE /api/chat/conversations/[id] ─────────────────────────────────
// Delete a conversation and all its messages.

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  await prisma.conversation.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
