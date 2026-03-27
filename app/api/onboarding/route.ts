import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(8).max(16).regex(/^\+\d{7,15}$/, 'Phone must be in E.164 format'),
  relationship: z.string().min(1).max(50),
})

const onboardingSchema = z.object({
  genotype: z.enum(['LQT1', 'LQT2', 'LQT3', 'OTHER', 'UNKNOWN']),
  medications: z.array(z.string().min(1).max(200)).optional().default([]),
  emergencyContacts: z.array(emergencyContactSchema).min(1),
})

export async function POST(request: Request) {
  try {
    // Uses getSupabaseUser() instead of getCurrentUser() because onboarding
    // creates/upserts the DB user record itself within the transaction below.
    const supabaseUser = await getSupabaseUser()
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await request.json()
    const parsed = onboardingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { genotype, emergencyContacts } = parsed.data

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const existing = await tx.user.findUnique({
        where: { supabaseId: supabaseUser.id },
        select: { id: true, onboarded: true },
      })

      const user = await tx.user.upsert({
        where: { supabaseId: supabaseUser.id },
        update: {
          email: supabaseUser.email ?? '',
          genotype,
          onboarded: true,
        },
        create: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email ?? '',
          firstName: supabaseUser.user_metadata?.first_name ?? null,
          lastName: supabaseUser.user_metadata?.last_name ?? null,
          genotype,
          onboarded: true,
        },
        select: { id: true },
      })

      // Wipe contacts on first-time onboarding (medications are managed via /api/medications during Step 2)
      if (!existing?.onboarded) {
        await tx.emergencyContact.deleteMany({ where: { userId: user.id } })
      }

      for (const contact of emergencyContacts) {
        await tx.emergencyContact.create({
          data: {
            userId: user.id,
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
          },
        })
      }

      return user
    })

    return NextResponse.json({ success: true, userId: result.id })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding data' },
      { status: 500 },
    )
  }
}
