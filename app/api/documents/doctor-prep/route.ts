import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { generateDoctorPrep } from '@/services/document-generator'

const bodySchema = z.object({
  procedureType: z.string().nullable().default(null),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const prepData = await generateDoctorPrep(user.id, parsed.data.procedureType)
    return NextResponse.json(prepData)
  } catch (error) {
    console.error('Doctor prep generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate doctor prep' },
      { status: 500 },
    )
  }
}
