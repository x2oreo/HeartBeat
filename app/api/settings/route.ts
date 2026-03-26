import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── GET /api/settings/profile ────────────────────────────────────────

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ email: user.email, genotype: user.genotype })
}

const patchSchema = z.object({
  genotype: z.enum(['LQT1', 'LQT2', 'LQT3', 'OTHER', 'UNKNOWN']),
})

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { genotype: parsed.data.genotype },
  })

  return NextResponse.json({ success: true })
}
