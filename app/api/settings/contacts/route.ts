import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const postSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(7).max(30).regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format'),
  relationship: z.string().min(1).max(50),
})

const deleteSchema = z.object({
  contactId: z.string().uuid(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contacts = await prisma.emergencyContact.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, phone: true, relationship: true },
    orderBy: { id: 'asc' },
  })

  return NextResponse.json(contacts)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const contact = await prisma.emergencyContact.create({
    data: { userId: user.id, ...parsed.data },
    select: { id: true, name: true, phone: true, relationship: true },
  })

  return NextResponse.json(contact, { status: 201 })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const contact = await prisma.emergencyContact.findFirst({
    where: { id: parsed.data.contactId, userId: user.id },
    select: { id: true },
  })
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  await prisma.emergencyContact.delete({ where: { id: parsed.data.contactId } })

  return NextResponse.json({ success: true })
}
