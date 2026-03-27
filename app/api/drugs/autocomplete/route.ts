import { NextRequest, NextResponse } from 'next/server'
import { searchDrugsWithAutocomplete } from '@/services/drug-autocomplete'

// Public endpoint (no auth) — used for drug autocomplete on scan page
// and during onboarding when the user record may not yet exist.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 1) {
    return NextResponse.json([])
  }

  const results = await searchDrugsWithAutocomplete(q.trim(), 8)
  return NextResponse.json(results)
}
