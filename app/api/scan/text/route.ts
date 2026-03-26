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

    const result = await scanDrugByText(parsed.data.drugName, user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/scan/text] Error:', err)
    return NextResponse.json(
      { error: 'Scan failed. Please try again.' },
      { status: 500 },
    )
  }
}
