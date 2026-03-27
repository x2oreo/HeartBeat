import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { z } from 'zod'
import { model } from '@/ai/client'
import { buildChatTools } from '@/ai/chat-tools'
import { buildChatSystemPrompt } from '@/ai/chat-prompts'
import type { PatientContext } from '@/ai/chat-prompts'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Genotype } from '@/types'

// ── Request Validation ──────────────────────────────────────────────────

const chatRequestSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())).min(1),
  conversationId: z.string().nullable().optional(),
}).passthrough()

// ── Helper: Load patient context for system prompt ──────────────────────

async function getPatientContext(userId: string): Promise<PatientContext> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      genotype: true,
      medications: {
        where: { active: true },
        select: { genericName: true },
      },
    },
  })

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null

  return {
    name,
    genotype: (user.genotype as Genotype) ?? null,
    medicationCount: user.medications.length,
    medicationNames: user.medications.map((m) => m.genericName),
  }
}

// ── Helper: Auto-generate conversation title from first message ─────────

function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim()
  if (trimmed.length <= 60) return trimmed
  return trimmed.slice(0, 57) + '...'
}

// ── Helper: Extract text content from a UIMessage ───────────────────────

function extractTextFromMessage(message: UIMessage): string {
  return message.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('') ?? ''
}

// ── POST /api/chat ──────────────────────────────────────────────────────

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await request.json()
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // The Zod schema validates structure; cast to UIMessage for the AI SDK
  const messages = parsed.data.messages as unknown as UIMessage[]
  const conversationId = parsed.data.conversationId
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 as string : null

  // Create or load conversation
  let convId: string
  if (conversationId) {
    // Verify the conversation belongs to this user
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      select: { id: true },
    })
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    convId = existing.id
  } else {
    const firstUserMessage = messages.find((m) => m.role === 'user')
    const firstText = firstUserMessage ? extractTextFromMessage(firstUserMessage) : 'New conversation'
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: generateTitle(firstText || 'New conversation'),
      },
    })
    convId = conversation.id
  }

  // Build tools with userId closure
  const tools = buildChatTools(user.id)

  // Load patient context for system prompt
  const patientContext = await getPatientContext(user.id)
  const systemPrompt = buildChatSystemPrompt(patientContext)

  // Save user message to DB
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  if (lastUserMessage) {
    const textContent = extractTextFromMessage(lastUserMessage)
    if (textContent) {
      await prisma.chatMessage.create({
        data: {
          conversationId: convId,
          role: 'user',
          content: textContent,
        },
      })
    }
  }

  const modelMessages = await convertToModelMessages(messages)

  // If the client sent an image, inject it into the last user message
  if (imageBase64) {
    for (let i = modelMessages.length - 1; i >= 0; i--) {
      const msg = modelMessages[i]
      if (msg.role === 'user') {
        const existingContent = Array.isArray(msg.content)
          ? msg.content
          : [{ type: 'text' as const, text: msg.content }]
        msg.content = [
          ...existingContent,
          { type: 'file' as const, data: imageBase64, mediaType: 'image/jpeg' as const },
        ]
        break
      }
    }
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools,
    temperature: 0,
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, steps }) => {
      // Persist assistant response (non-fatal — don't break the stream)
      try {
        const toolNames = steps.flatMap((step) =>
          step.toolCalls.map((tc) => tc.toolName)
        )

        await prisma.chatMessage.create({
          data: {
            conversationId: convId,
            role: 'assistant',
            content: text,
            toolData: toolNames.length > 0 ? { toolsUsed: toolNames } : undefined,
          },
        })

        await prisma.conversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        })
      } catch (err) {
        console.error(`[POST /api/chat] Failed to persist message for conv=${convId} user=${user.id}:`, err)
      }
    },
  })

  return result.toUIMessageStreamResponse({
    headers: {
      'X-Conversation-Id': convId,
    },
  })
}
