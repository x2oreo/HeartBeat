import type { ProhibitedDrug } from '@/types'

export function groupDrugsByClass(drugs: ProhibitedDrug[]): Map<string, ProhibitedDrug[]> {
  const byClass = new Map<string, ProhibitedDrug[]>()
  for (const drug of drugs) {
    const list = byClass.get(drug.drugClass) ?? []
    list.push(drug)
    byClass.set(drug.drugClass, list)
  }
  return byClass
}
