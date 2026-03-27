import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { generateDoctorPrep, getDoctorPrepDocuments } from '@/services/document-generator'

const bodySchema = z.object({
  doctorSpecialty: z.enum([
    'Cardiologist', 'Dentist', 'General Practitioner', 'Surgeon',
    'Anesthesiologist', 'Psychiatrist', 'ENT', 'Gastroenterologist',
    'Dermatologist', 'Ophthalmologist', 'Other',
  ]),
  customSpecialty: z.string().nullable().default(null),
  language: z.enum([
    'English', 'Bulgarian', 'German', 'French', 'Spanish', 'Italian',
    'Portuguese', 'Turkish', 'Arabic', 'Chinese', 'Japanese', 'Korean', 'Other',
  ]),
  customLanguage: z.string().nullable().default(null),
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

    const { doctorSpecialty, customSpecialty, language, customLanguage } = parsed.data
    const prepData = await generateDoctorPrep(
      user.id,
      doctorSpecialty,
      customSpecialty,
      language,
      customLanguage,
    )
    return NextResponse.json(prepData)
  } catch (error) {
    console.error('Doctor prep generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate doctor prep' },
      { status: 500 },
    )
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const documents = await getDoctorPrepDocuments(user.id)
    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Failed to fetch doctor prep documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 },
    )
  }
}
