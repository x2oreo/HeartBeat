import { NextRequest, NextResponse } from 'next/server'
import { searchDrugs } from '@/services/drug-lookup'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 1) {
    return NextResponse.json([])
  }

  const results = searchDrugs(q.trim(), 10)

  return NextResponse.json(
    results.map((drug) => ({
      genericName: drug.genericName,
      brandNames: drug.brandNames,
      riskCategory: drug.riskCategory,
      drugClass: drug.drugClass,
    })),
  )
}
