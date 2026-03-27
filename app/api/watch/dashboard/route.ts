import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getWatchDashboardData } from '@/services/watch-health'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getWatchDashboardData(user.id)
  return NextResponse.json(data)
}
