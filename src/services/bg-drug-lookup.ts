// Resolves Bulgarian brand names to their INN (generic name) using the
// bg_drugs table in Supabase (sourced from the Bulgarian Positive Drug List).

import { prisma } from '@/lib/prisma'

type BgDrugMatch = {
  inn: string
  brandName: string
  atcCode: string | null
}

/**
 * Look up a Bulgarian brand name and resolve it to its INN.
 * Uses case-insensitive exact match first, then prefix match.
 * Returns null if no match found.
 */
export async function resolveBgBrandName(query: string): Promise<BgDrugMatch | null> {
  try {
    // Exact match on brand_name (case-insensitive)
    const exact = await prisma.bgDrug.findFirst({
      where: { brandName: { equals: query, mode: 'insensitive' } },
    })

    if (exact) {
      return { inn: exact.inn, brandName: exact.brandName, atcCode: exact.atcCode }
    }

    // Exact match on INN (case-insensitive) — user might type the INN directly
    const innMatch = await prisma.bgDrug.findFirst({
      where: { inn: { equals: query, mode: 'insensitive' } },
    })

    if (innMatch) {
      return { inn: innMatch.inn, brandName: innMatch.brandName, atcCode: innMatch.atcCode }
    }

    // Prefix match on brand_name (e.g., "cipri" → "CIPRINOL")
    const prefix = await prisma.bgDrug.findFirst({
      where: { brandName: { startsWith: query, mode: 'insensitive' } },
    })

    if (prefix) {
      return { inn: prefix.inn, brandName: prefix.brandName, atcCode: prefix.atcCode }
    }

    return null
  } catch {
    return null // DB error — degrade silently
  }
}
