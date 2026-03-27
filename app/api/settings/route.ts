import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── GET /api/settings/profile ────────────────────────────────────────

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    genotype: user.genotype,
  })
}

const patchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  genotype: z.enum(['LQT1', 'LQT2', 'LQT3', 'OTHER', 'UNKNOWN']).optional(),
}).refine(data => data.firstName || data.lastName || data.genotype, {
  message: 'At least one field must be provided',
})

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const data: Record<string, string> = {}
  if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName.trim()
  if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName.trim()
  if (parsed.data.genotype !== undefined) data.genotype = parsed.data.genotype

  await prisma.user.update({
    where: { id: user.id },
    data,
  })

  return NextResponse.json({ success: true })
}
