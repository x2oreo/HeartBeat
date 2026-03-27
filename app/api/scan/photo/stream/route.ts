import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { scanDrugByPhoto } from '@/services/photo-scanner'
import type { PipelineStep } from '@/types'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024

const ScanPhotoBody = z.object({
  image: z.string()
    .min(100, 'Image data too small')
    .max(Math.ceil(MAX_IMAGE_SIZE * 4 / 3), 'Image too large. Please use a photo under 10MB.'),
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

  const parsed = ScanPhotoBody.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  const scanPromise = (async () => {
    function onStep(step: PipelineStep) {
      const line = JSON.stringify({ type: 'step', step }) + '\n'
      void writer.write(encoder.encode(line))
    }

    try {
      const result = await Promise.race([
        scanDrugByPhoto(parsed.data.image, user.id, onStep),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SCAN_TIMEOUT')), 60_000),
        ),
      ])

      const line = JSON.stringify({ type: 'result', data: result }) + '\n'
      await writer.write(encoder.encode(line))
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'SCAN_TIMEOUT'
          ? 'Photo scan timed out. Please try again.'
          : 'Photo scan failed. Please try again.'
      const line = JSON.stringify({ type: 'error', error: message }) + '\n'
      await writer.write(encoder.encode(line))
    } finally {
      await writer.close()
    }
  })()

  void scanPromise

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
