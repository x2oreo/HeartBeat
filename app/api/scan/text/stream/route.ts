import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { scanDrugByText } from '@/services/drug-scanner'
import type { PipelineStep } from '@/types'

const ScanTextBody = z.object({
  drugName: z.string().trim().min(2).max(100),
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

  const parsed = ScanTextBody.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Run scan in background — writer pushes lines as steps complete
  const scanPromise = (async () => {
    function onStep(step: PipelineStep) {
      const line = JSON.stringify({ type: 'step', step }) + '\n'
      void writer.write(encoder.encode(line))
    }

    try {
      const result = await Promise.race([
        scanDrugByText(parsed.data.drugName, user.id, undefined, onStep),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SCAN_TIMEOUT')), 30_000),
        ),
      ])

      const line = JSON.stringify({ type: 'result', data: result }) + '\n'
      await writer.write(encoder.encode(line))
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'SCAN_TIMEOUT'
          ? 'Scan timed out. Please try again.'
          : 'Scan failed. Please try again.'
      const line = JSON.stringify({ type: 'error', error: message }) + '\n'
      await writer.write(encoder.encode(line))
    } finally {
      await writer.close()
    }
  })()

  // Don't await — return the readable side immediately so the client starts receiving
  void scanPromise

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
