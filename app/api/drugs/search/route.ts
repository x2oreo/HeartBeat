import { NextRequest, NextResponse } from 'next/server'
import { searchDrugs } from '@/services/drug-lookup'

// Public endpoint (no auth) — used for drug autocomplete during onboarding
// when the user record may not yet exist in the database.
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
