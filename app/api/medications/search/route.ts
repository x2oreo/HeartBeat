import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { searchDrugs } from '@/services/drug-lookup'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''

  if (query.length < 2) {
    return NextResponse.json([])
  }

  const results = searchDrugs(query, 8)

  return NextResponse.json(
    results.map((drug) => ({
      genericName: drug.genericName,
      brandNames: drug.brandNames,
      riskCategory: drug.riskCategory,
      isDTA: drug.isDTA,
    })),
  )
}
