// ── Drug Autocomplete Service ───────────────────────────────────────
// Priority: 1) Local QT drugs  2) Bulgarian Positive List (Supabase)  3) RxNorm
// Local results always appear first (with full QT risk data).
// Bulgarian results add local brand-name coverage.
// RxNorm fills remaining slots for international coverage.

import { searchDrugs, lookupDrug } from '@/services/drug-lookup'
import { prisma } from '@/lib/prisma'
import { EXTERNAL_API_CONFIG } from '@/services/external/config'
import type { AutocompleteSuggestion } from '@/types'

// ── RxNorm Spelling Suggestions ─────────────────────────────────────

type SpellingSuggestionsResponse = {
  suggestionGroup?: {
    name?: string
    suggestionList?: {
      suggestion?: string[]
    }
  }
}

async function fetchRxNormSuggestions(
  query: string,
): Promise<string[]> {
  if (!EXTERNAL_API_CONFIG.rxnorm.enabled) return []

  const url = `${EXTERNAL_API_CONFIG.rxnorm.baseUrl}/spellingsuggestions.json?name=${encodeURIComponent(query)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000) // 2s — autocomplete must be fast

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return []

    const data = (await res.json()) as SpellingSuggestionsResponse
    return data.suggestionGroup?.suggestionList?.suggestion ?? []
  } catch {
    return [] // timeout or network error — degrade silently
  } finally {
    clearTimeout(timeout)
  }
}

// ── Bulgarian Positive List (Supabase) ────────────────────────────────

type BgDrugRow = { inn: string; brand_name: string; atc_code: string | null }

async function fetchBgDrugSuggestions(
  query: string,
  limit: number,
): Promise<AutocompleteSuggestion[]> {
  try {
    // Use trigram similarity search on both INN and brand_name
    const rows = await prisma.$queryRaw<BgDrugRow[]>`
      SELECT DISTINCT ON (inn) inn, brand_name, atc_code
      FROM bg_drugs
      WHERE inn ILIKE ${'%' + query + '%'}
         OR brand_name ILIKE ${'%' + query + '%'}
      ORDER BY inn,
        CASE WHEN inn ILIKE ${query + '%'} THEN 0
             WHEN brand_name ILIKE ${query + '%'} THEN 1
             ELSE 2 END
      LIMIT ${limit}
    `

    if (rows.length === 0) return []

    // Group brands by INN
    const innSet = rows.map((r) => r.inn)
    const allBrands = await prisma.$queryRaw<BgDrugRow[]>`
      SELECT inn, brand_name, atc_code
      FROM bg_drugs
      WHERE inn = ANY(${innSet})
    `

    const grouped = new Map<string, { brands: string[]; atc: string | null }>()
    for (const row of allBrands) {
      const existing = grouped.get(row.inn)
      if (existing) {
        if (!existing.brands.includes(row.brand_name)) {
          existing.brands.push(row.brand_name)
        }
      } else {
        grouped.set(row.inn, { brands: [row.brand_name], atc: row.atc_code })
      }
    }

    return Array.from(grouped.entries()).map(([inn, data]): AutocompleteSuggestion => {
      // Cross-reference with local QT database
      const qtMatch = lookupDrug(inn)
      return {
        genericName: inn.toLowerCase(),
        brandNames: data.brands.slice(0, 5), // Cap at 5 brand names for display
        riskCategory: qtMatch?.riskCategory ?? null,
        isDTA: qtMatch?.isDTA ?? false,
        drugClass: qtMatch?.drugClass ?? null,
        source: 'BG_POSITIVE_LIST' as const,
        rxcui: null,
      }
    })
  } catch {
    return [] // DB error — degrade silently
  }
}

// ── Deduplication ───────────────────────────────────────────────────

/** Quick Levenshtein distance — used to filter near-duplicate suggestions. */
function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  )
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/** Returns true if `name` is too similar to any name in `existing`. */
function isTooSimilar(name: string, existing: string[]): boolean {
  const lower = name.toLowerCase()
  for (const ex of existing) {
    if (lower === ex) return true
    // Within 2 edits = likely the same drug (typo variant)
    if (editDistance(lower, ex) <= 2) return true
    // One is a prefix of the other (e.g. "ibuprofen" vs "ibuprofen lysine")
    if (lower.startsWith(ex) || ex.startsWith(lower)) return true
  }
  return false
}

// ── Unified Autocomplete ────────────────────────────────────────────

/**
 * Search for drugs across local QT database and RxNorm.
 * Local results always appear first (with full QT risk data).
 * RxNorm results fill remaining slots when local results are sparse.
 */
export async function searchDrugsWithAutocomplete(
  query: string,
  limit = 8,
): Promise<AutocompleteSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  // 1. Local search (instant, 111 QT drugs)
  const localResults = searchDrugs(trimmed, limit)
  const localSuggestions: AutocompleteSuggestion[] = localResults.map((drug) => ({
    genericName: drug.genericName,
    brandNames: drug.brandNames,
    riskCategory: drug.riskCategory,
    isDTA: drug.isDTA,
    drugClass: drug.drugClass,
    source: 'LOCAL' as const,
    rxcui: null,
  }))

  // If we have enough local results, skip external sources
  if (localSuggestions.length >= limit) {
    return localSuggestions.slice(0, limit)
  }

  // 2. Bulgarian Positive List (Supabase) — fast DB query
  const remainingSlots = limit - localSuggestions.length
  const bgSuggestions = trimmed.length >= 2
    ? await fetchBgDrugSuggestions(trimmed, remainingSlots)
    : []

  // Deduplicate BG results against local
  const localNames = localSuggestions.map((s) => s.genericName.toLowerCase())
  const bgFiltered = bgSuggestions.filter(
    (s) => !isTooSimilar(s.genericName, localNames),
  )

  const combined = [...localSuggestions, ...bgFiltered]
  if (combined.length >= limit || trimmed.length < 3) {
    return combined.slice(0, limit)
  }

  // 3. RxNorm spelling suggestions (remote API, slowest)
  const rxSuggestions = await fetchRxNormSuggestions(trimmed)

  const allNames = combined.map((s) => s.genericName.toLowerCase())
  const rxFiltered = rxSuggestions
    .filter((name) => !isTooSimilar(name, allNames))
    .slice(0, limit - combined.length)
    .map((name): AutocompleteSuggestion => ({
      genericName: name.toLowerCase(),
      brandNames: [],
      riskCategory: null,
      isDTA: false,
      drugClass: null,
      source: 'RXNORM' as const,
      rxcui: null,
    }))

  return [...combined, ...rxFiltered].slice(0, limit)
}
