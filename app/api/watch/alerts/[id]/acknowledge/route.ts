import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { acknowledgeAlert } from '@/services/watch-health'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const updated = await acknowledgeAlert(id, user.id)

  if (!updated) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
