import type { DrugInfo, QtDrugEntry } from '@/types'
import qtdrugs from '@/data/qtdrugs.json'

// TS infers JSON string fields as `string`, not as literal unions like RiskCategory.
// Boundary assertion for a static file we curate — validated by our test drugs.
const drugDatabase = qtdrugs as unknown as readonly QtDrugEntry[]

function toDrugInfo(entry: QtDrugEntry): DrugInfo {
  return {
    genericName: entry.genericName,
    brandNames: entry.searchTerms.filter(
      (t) => t.toLowerCase() !== entry.genericName.toLowerCase(),
    ),
    riskCategory: entry.riskCategory,
    isDTA: entry.isDTA,
    drugClass: entry.drugClass,
    primaryUse: entry.primaryUse,
    qtMechanism: entry.qtMechanism,
    cyp: entry.cyp,
    source: 'CREDIBLEMEDS_VERIFIED',
  }
}

/**
 * Look up a drug by name in the local QT risk database.
 * Searches genericName and searchTerms (brand names, common misspellings).
 * Returns null if not found — caller decides whether to use AI fallback.
 */
export function lookupDrug(query: string): DrugInfo | null {
  const normalized = query.toLowerCase().trim()
  if (!normalized) return null

  const entry = drugDatabase.find(
    (drug) =>
      drug.genericName.toLowerCase() === normalized ||
      drug.searchTerms.some((term) => term.toLowerCase() === normalized),
  )

  if (!entry) return null

  return toDrugInfo(entry)
}

/**
 * Fuzzy search for drugs — returns all partial matches.
 * Used for autocomplete / search suggestions.
 */
export function searchDrugs(query: string, limit = 10): DrugInfo[] {
  const normalized = query.toLowerCase().trim()
  if (!normalized) return []

  return drugDatabase
    .filter(
      (drug) =>
        drug.genericName.toLowerCase().includes(normalized) ||
        drug.searchTerms.some((term) => term.toLowerCase().includes(normalized)),
    )
    .slice(0, limit)
    .map(toDrugInfo)
}

// ── Fuzzy Matching ──────────────────────────────────────────────────

export type FuzzyMatch = {
  drug: DrugInfo
  matchType: 'EXACT' | 'FUZZY'
  confidence: number // 0.0-1.0
  matchedTerm: string // which searchTerm or genericName matched
}

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  )
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/**
 * Fuzzy lookup: finds the best match in the database using Levenshtein distance.
 * Threshold: ≤2 edits for names ≤8 chars, ≤3 for longer names.
 * Returns null if no match within threshold.
 */
export function fuzzyLookupDrug(query: string): FuzzyMatch | null {
  const normalized = query.toLowerCase().trim()
  if (!normalized || normalized.length < 2) return null

  // First try exact match (fast path)
  const exactEntry = drugDatabase.find(
    (drug) =>
      drug.genericName.toLowerCase() === normalized ||
      drug.searchTerms.some((term) => term.toLowerCase() === normalized),
  )
  if (exactEntry) {
    const matchedTerm =
      exactEntry.genericName.toLowerCase() === normalized
        ? exactEntry.genericName
        : exactEntry.searchTerms.find((t) => t.toLowerCase() === normalized) ?? exactEntry.genericName
    return {
      drug: toDrugInfo(exactEntry),
      matchType: 'EXACT',
      confidence: 1.0,
      matchedTerm,
    }
  }

  // Fuzzy match: find closest match across all drugs and their search terms
  const maxEdits = normalized.length <= 8 ? 2 : 3
  let bestMatch: { entry: QtDrugEntry; distance: number; term: string } | null = null

  for (const drug of drugDatabase) {
    const termsToCheck = [drug.genericName, ...drug.searchTerms]
    for (const term of termsToCheck) {
      const termLower = term.toLowerCase()

      // Skip if length difference exceeds max edits (fast rejection)
      if (Math.abs(termLower.length - normalized.length) > maxEdits) continue

      const dist = levenshtein(normalized, termLower)
      if (dist <= maxEdits && (!bestMatch || dist < bestMatch.distance)) {
        bestMatch = { entry: drug, distance: dist, term }
      }
    }
  }

  if (!bestMatch) return null

  // Confidence: 1.0 for exact, decreasing with edit distance
  const maxLen = Math.max(normalized.length, bestMatch.term.length)
  const confidence = Math.max(0, 1 - bestMatch.distance / maxLen)

  return {
    drug: toDrugInfo(bestMatch.entry),
    matchType: 'FUZZY',
    confidence: Math.round(confidence * 100) / 100,
    matchedTerm: bestMatch.term,
  }
}
