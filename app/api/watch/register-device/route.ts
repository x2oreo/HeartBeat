import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getWatchUser } from '@/lib/watch-auth'
import { registerDeviceToken } from '@/services/watch-health'

const bodySchema = z.object({
  apnsToken: z.string().min(1).max(200),
})

export async function POST(request: Request) {
  const user = await getWatchUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  await registerDeviceToken(user.id, parsed.data.apnsToken)

  return NextResponse.json({ success: true })
}
