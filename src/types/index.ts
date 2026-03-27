// HeartGuard Shared Types — Single Source of Truth
// All cross-boundary types live here. Import from '@/types' everywhere.

import type { EmergencyCardAIOutput } from '@/ai/document-schemas'

// ── Risk & Classification ──────────────────────────────────────────

export type RiskCategory = 'KNOWN_RISK' | 'POSSIBLE_RISK' | 'CONDITIONAL_RISK' | 'NOT_LISTED'

export type ComboRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type Genotype = 'LQT1' | 'LQT2' | 'LQT3' | 'OTHER' | 'UNKNOWN'

export type ScanType = 'TEXT' | 'PHOTO'

export type RiskSource =
  | 'CREDIBLEMEDS_VERIFIED'  // In local curated JSON (sourced from CredibleMeds)
  | 'CREDIBLEMEDS_API'       // From CredibleMeds API, not in local JSON
  | 'MULTI_SOURCE'           // Confirmed by multiple data sources
  | 'BG_VERIFIED'            // Resolved via Bulgarian Positive Drug List
  | 'AI_ASSESSED'            // AI-only assessment, no external verification
  | 'AI_ENRICHED'            // AI assessment supplemented with external data

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

// ── Drug Search (autocomplete result from /api/medications/search) ─

export type DrugSearchResult = {
  genericName: string
  brandNames: string[]
  riskCategory: RiskCategory
  isDTA: boolean
}

// ── Autocomplete (unified local + RxNorm results) ────────────────

export type AutocompleteSource = 'LOCAL' | 'RXNORM' | 'DRUG_TABLE' | 'BG_POSITIVE_LIST'

export type AutocompleteSuggestion = {
  genericName: string
  brandNames: string[]
  riskCategory: RiskCategory | null // null = not evaluated for QT risk
  isDTA: boolean
  drugClass: string | null
  source: AutocompleteSource
  rxcui: string | null
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

// ── Pipeline Tracing ─────────────────────────────────────────────────

export type PipelineStepStatus = 'HIT' | 'MISS' | 'SKIPPED' | 'ERROR'

export type PipelineStep = {
  name: string
  status: PipelineStepStatus
  durationMs: number
  detail?: string
}

// ── Scan Results ───────────────────────────────────────────────────

export type DrugEnrichment = {
  credibleMedsVerified: boolean
  fdaTorsadesReports: number | null
  rxnormResolved: boolean
  dataSources: string[] // e.g., ["local_db", "crediblemeds_api", "openfda"]
}

export type FuzzyMatchInfo = {
  originalQuery: string
  matchedName: string
  confidence: number
}

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
  enrichment: DrugEnrichment | null
  dosage: string | null
  fuzzyMatch: FuzzyMatchInfo | null
  pipelineTrace?: PipelineStep[]
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
  email?: string
  relationship: string
}

export type EmergencyCardData = {
  patientName: string
  genotype: Genotype | null
  medications: {
    name: string
    riskCategory: RiskCategory
    isDTA: boolean
    dosage?: string
    brandName?: string
  }[]
  emergencyContacts: EmergencyContactInfo[]
  criticalNotes: string[]
  generatedAt: string
  shareSlug: string
  patientPhoto?: string
  personalNotes?: { en: string; bg: string }
}

// ── Doctor Prep ──────────────────────────────────────────────────────

export type DoctorSpecialty =
  | 'Cardiologist'
  | 'Dentist'
  | 'General Practitioner'
  | 'Surgeon'
  | 'Anesthesiologist'
  | 'Psychiatrist'
  | 'ENT'
  | 'Gastroenterologist'
  | 'Dermatologist'
  | 'Ophthalmologist'
  | 'Other'

export type DocumentLanguage =
  | 'English'
  | 'Bulgarian'
  | 'German'
  | 'French'
  | 'Spanish'
  | 'Italian'
  | 'Portuguese'
  | 'Turkish'
  | 'Arabic'
  | 'Chinese'
  | 'Japanese'
  | 'Korean'
  | 'Other'

export type ProhibitedDrug = {
  genericName: string
  drugClass: string
  riskCategory: RiskCategory
  isDTA: boolean
}

export type MedicationImplication = {
  name: string
  implication: string
}

export type MedicationToAvoid = {
  genericName: string
  drugClass: string
  reason: string
}

export type DoctorPrepData = {
  id?: string
  patientName: string
  genotype: Genotype | null
  currentMedications: {
    name: string
    riskCategory: RiskCategory
    isDTA: boolean
    cypProfile: CypData
  }[]
  doctorSpecialty: DoctorSpecialty
  customSpecialty: string | null
  language: DocumentLanguage
  customLanguage: string | null
  summary: string
  syndromeExplanation: string
  drugSafetyBrief: string
  questionsForDoctor: string[]
  medicationsToAvoid: MedicationToAvoid[]
  saferAlternatives: AlternativeDrug[]
  prohibitedDrugs: ProhibitedDrug[]
  medicationImplications: MedicationImplication[]
  specialtyWarnings: string[]
  generatedAt: string
}

export type SavedDoctorPrepDocument = {
  id: string
  doctorSpecialty: DoctorSpecialty
  customSpecialty: string | null
  language: DocumentLanguage
  customLanguage: string | null
  generatedAt: string
}

export type SavedDoctorPrepDocumentWithPreview = SavedDoctorPrepDocument & {
  patientName: string
  genotype: string | null
  medicationNames: string[]
  avoidCount: number
  warningCount: number
  summary: string
}

// ── Enhanced Document Types ─────────────────────────────────────────

export type EnhancedEmergencyCardData = EmergencyCardData & {
  aiContent?: EmergencyCardAIOutput
}

// ── Country Emergency Services ─────────────────────────────────────

export type CountryEmergencyInfo = {
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string
  /** Human-readable country name */
  countryName: string
  /** Dedicated ambulance / medical line — the number to call for a cardiac emergency */
  ambulance: string
  /** Catch-all general emergency number; may equal ambulance */
  general: string
}

// ── Emergency Card Page Local Types ────────────────────────────────

export type ProfileData = {
  name: string | null
  email: string
  genotype: string | null
}

export type ContactData = {
  id: string
  name: string
  phone: string
  relationship: string
}

export type MedicationData = {
  id: string
  genericName: string
  brandName: string | null
  dosage: string | null
  qtRisk: string
  isDTA: boolean
}

// ── Watch Health Data ──────────────────────────────────────────────

export type WatchRiskLevel = 'NORMAL' | 'CAUTION' | 'ELEVATED'

export type WatchStressLevel = 'CALM' | 'MODERATE' | 'HIGH'

export type WatchMonitoringMode = 'normal' | 'heightened'

export type HealthMetricPayload = {
  heartRate: number
  hrv: number
  restingHR: number
  rrIntervalMs: number
  steps: number
  activeEnergy: number
  riskLevel: WatchRiskLevel
  stressLevel: WatchStressLevel
  isAsleep: boolean
  irregularRhythm: boolean
  recordedAt: string // ISO 8601
}

export type HealthAlertPayload = {
  riskLevel: 'CAUTION' | 'ELEVATED'
  heartRate: number
  hrv: number
  stressLevel: WatchStressLevel
  isAsleep: boolean
  irregularRhythm: boolean
  message: string
  triggeredAt: string // ISO 8601
  latitude?: number
  longitude?: number
}

export type WatchConfigResponse = {
  monitoringMode: WatchMonitoringMode
  medications: { genericName: string; riskCategory: RiskCategory }[]
  genotype: Genotype | null
}

export type SOSSentPayload = {
  alertId: string
  contactsReached: number
}

export type HealthStreamEvent = {
  type: 'health-update' | 'alert' | 'connected' | 'sos-sent'
  data: HealthMetricPayload | HealthAlertPayload | SOSSentPayload | null
  timestamp: string
}

export type WatchPushPayload =
  | { type: 'drug-alert'; drugName: string; riskCategory: RiskCategory; message: string }
  | { type: 'mode-change'; mode: WatchMonitoringMode; reason: string }

// ── Chat Conversations ─────────────────────────────────────────────

export type ConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export type ConversationMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}
