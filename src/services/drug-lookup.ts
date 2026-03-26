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
