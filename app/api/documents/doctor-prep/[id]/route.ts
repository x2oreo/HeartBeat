import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDoctorPrepDocument, deleteDoctorPrepDocument } from '@/services/document-generator'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const doc = await getDoctorPrepDocument(user.id, id)
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    return NextResponse.json(doc)
  } catch (error) {
    console.error('Failed to fetch doctor prep document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const deleted = await deleteDoctorPrepDocument(user.id, id)
    if (!deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete doctor prep document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    )
  }
}
