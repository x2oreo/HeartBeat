import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { lookupDrug } from '@/services/drug-lookup'
import { clearScanCache } from '@/services/drug-scanner'

// ── GET /api/medications ─────────────────────────────────────────────

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const medications = await prisma.medication.findMany({
    where: { userId: user.id, active: true },
    select: {
      id: true,
      genericName: true,
      brandName: true,
      dosage: true,
      frequency: true,
      qtRisk: true,
      isDTA: true,
      addedAt: true,
    },
    orderBy: { addedAt: 'desc' },
  })

  return NextResponse.json(medications)
}

// ── POST /api/medications ────────────────────────────────────────────

const postSchema = z.object({
  drugName: z.string().min(2).max(200),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { drugName, dosage, frequency } = parsed.data
  const drugInfo = lookupDrug(drugName)

  const medication = await prisma.medication.create({
    data: {
      userId: user.id,
      genericName: drugInfo?.genericName ?? drugName.trim(),
      brandName: drugInfo?.brandNames[0] ?? null,
      dosage: dosage ?? null,
      frequency: frequency ?? null,
      qtRisk: drugInfo?.riskCategory ?? 'NOT_LISTED',
      isDTA: drugInfo?.isDTA ?? false,
      cypData: drugInfo?.cyp ?? undefined,
    },
    select: {
      id: true,
      genericName: true,
      brandName: true,
      dosage: true,
      frequency: true,
      qtRisk: true,
      isDTA: true,
      addedAt: true,
    },
  })

  clearScanCache(user.id)
  return NextResponse.json(medication, { status: 201 })
}

// ── DELETE /api/medications ──────────────────────────────────────────

const deleteSchema = z.object({
  medicationId: z.string().uuid(),
})

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { medicationId } = parsed.data

  // Verify ownership before soft-deleting
  const medication = await prisma.medication.findFirst({
    where: { id: medicationId, userId: user.id },
    select: { id: true },
  })

  if (!medication) {
    return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
  }

  await prisma.medication.update({
    where: { id: medicationId },
    data: { active: false },
  })

  clearScanCache(user.id)
  return NextResponse.json({ success: true })
}
