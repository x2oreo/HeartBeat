import { NextResponse } from 'next/server'
import { getWatchUser } from '@/lib/watch-auth'
import { getWatchConfig } from '@/services/watch-health'

export async function GET(request: Request) {
  const user = await getWatchUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getWatchConfig(user.id)

  return NextResponse.json(config)
}
