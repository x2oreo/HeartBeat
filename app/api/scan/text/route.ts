import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { scanDrugByText } from '@/services/drug-scanner'

const ScanTextBody = z.object({
  drugName: z.string().trim().min(2).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = ScanTextBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await Promise.race([
      scanDrugByText(parsed.data.drugName, user.id),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SCAN_TIMEOUT')), 30_000),
      ),
    ])
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/scan/text] Error:', err)
    const message = err instanceof Error && err.message === 'SCAN_TIMEOUT'
      ? 'Scan timed out. External medical databases may be slow. Please try again.'
      : 'Scan failed. Please try again.'
    return NextResponse.json(
      { error: message },
      { status: err instanceof Error && err.message === 'SCAN_TIMEOUT' ? 504 : 500 },
    )
  }
}
