import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { scanDrugByPhoto } from '@/services/photo-scanner'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB in bytes -> ~13.3M base64 chars

const ScanPhotoBody = z.object({
  image: z.string()
    .min(100, 'Image data too small')
    .max(Math.ceil(MAX_IMAGE_SIZE * 4 / 3), 'Image too large. Please use a photo under 10MB.'),
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

    const parsed = ScanPhotoBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await scanDrugByPhoto(parsed.data.image, user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/scan/photo] Error:', err)
    return NextResponse.json(
      { error: 'Photo scan failed. Please try again.' },
      { status: 500 },
    )
  }
}
