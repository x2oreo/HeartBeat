// HeartGuard Shared Types — Single Source of Truth
// All cross-boundary types live here. Import from '@/types' everywhere.

// ── Risk & Classification ──────────────────────────────────────────

export type RiskCategory = 'KNOWN_RISK' | 'POSSIBLE_RISK' | 'CONDITIONAL_RISK' | 'NOT_LISTED'

export type ComboRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type Genotype = 'LQT1' | 'LQT2' | 'LQT3' | 'OTHER' | 'UNKNOWN'

export type ScanType = 'TEXT' | 'PHOTO'

export type RiskSource = 'CREDIBLEMEDS_VERIFIED' | 'AI_ASSESSED'

// ── Drug Data (qtdrugs.json) ───────────────────────────────────────

export type CypData = {
  metabolizedBy: string[]
  inhibits: string[]
  induces: string[]
}

export type QtDrugEntry = {
  genericName: string
  searchTerms: string[]
  riskCategory: RiskCategory
  isDTA: boolean
  drugClass: string
  primaryUse: string
  qtMechanism: string
  cyp: CypData
}

// ── Drug Info (lookup result) ──────────────────────────────────────

export type DrugInfo = {
  genericName: string
  brandNames: string[]
  riskCategory: RiskCategory
  isDTA: boolean
  drugClass: string
  primaryUse: string
  qtMechanism: string
  cyp: CypData
  source: RiskSource
}

// ── AI Combo Analysis ──────────────────────────────────────────────

export type DrugInteraction = {
  drugA: string
  drugB: string
  mechanism: string
  severity: ComboRiskLevel
}

export type AlternativeDrug = {
  genericName: string
  drugClass: string
  whySafer: string
}

export type ComboAnalysisResult = {
  comboRiskLevel: ComboRiskLevel
  summary: string
  interactions: DrugInteraction[]
  alternatives: AlternativeDrug[]
  genotypeConsiderations: string | null
}

// ── Scan Results ───────────────────────────────────────────────────

export type ScanResult = {
  drugName: string
  genericName: string
  riskCategory: RiskCategory
  isDTA: boolean
  drugClass: string
  primaryUse: string
  qtMechanism: string
  cyp: CypData
  source: RiskSource
  comboAnalysis: ComboAnalysisResult | null
  scannedAt: string
}

export type PhotoScanResult = {
  detectedDrugNames: string[]
  scanResults: ScanResult[]
  unrecognizedText: string[]
}

// ── Documents ──────────────────────────────────────────────────────

export type EmergencyContactInfo = {
  name: string
  phone: string
  relationship: string
}

export type EmergencyCardData = {
  patientName: string
  genotype: Genotype | null
  medications: {
    name: string
    riskCategory: RiskCategory
    isDTA: boolean
  }[]
  emergencyContacts: EmergencyContactInfo[]
  criticalNotes: string[]
  generatedAt: string
  shareSlug: string
}

export type DoctorPrepData = {
  patientName: string
  genotype: Genotype | null
  currentMedications: {
    name: string
    riskCategory: RiskCategory
    isDTA: boolean
    cypProfile: CypData
  }[]
  procedureType: string | null
  drugSafetyBrief: string
  questionsForDoctor: string[]
  medicationsToAvoid: string[]
  saferAlternatives: AlternativeDrug[]
  generatedAt: string
}
