import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { generateDoctorPrep } from '@/services/document-generator'
import type { PipelineStep } from '@/types'

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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  const { doctorSpecialty, customSpecialty, language, customLanguage } = parsed.data

  const generatePromise = (async () => {
    function onStep(step: PipelineStep) {
      const line = JSON.stringify({ type: 'step', step }) + '\n'
      void writer.write(encoder.encode(line))
    }

    try {
      const result = await generateDoctorPrep(user.id, doctorSpecialty, customSpecialty, language, customLanguage, onStep)

      const line = JSON.stringify({ type: 'result', data: result }) + '\n'
      await writer.write(encoder.encode(line))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Document generation failed. Please try again.'
      const line = JSON.stringify({ type: 'error', error: message }) + '\n'
      await writer.write(encoder.encode(line))
    } finally {
      await writer.close()
    }
  })()

  void generatePromise

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
