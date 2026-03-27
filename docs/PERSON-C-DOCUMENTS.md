# QTShield — Person C: Documents & Emergency

## Your Role
You own the medical document system — Emergency Card and Doctor Visit Prep. These are the features that make QTShield feel like a REAL medical product, not just a drug lookup tool. The Emergency Card is the second most impressive demo feature after the scan. A shareable card that an ER doctor in a foreign country can read in 30 seconds — that's powerful.

## What Others Are Building

**Person A (Scan Engine)** builds the drug scanning. You don't depend on them at all. You both use Claude API but with DIFFERENT prompts and schemas in DIFFERENT files. Zero overlap.

**Person B (Profile)** creates the User and Medication data that YOUR document generator reads. When you generate an Emergency Card, you load the user's profile, medications, and emergency contacts from Prisma — the same records Person B creates through onboarding.

**Person D (Data)** curates qtdrugs.json. You don't directly use this file, but the medication data in the DB (which Person B stores) comes from it originally.

## How Your Work Connects

```
Person B creates User + Medications + EmergencyContacts in DB
       ↓
YOUR document-generator.ts loads this data from Prisma
       ↓
YOUR AI prompts feed the data to Claude
       ↓
Claude returns structured document content (validated by YOUR Zod schemas)
       ↓
YOUR pages render the content as visual cards / PDF
       ↓
Public shareable link lets ER doctors view the card without auth
```

## Files You Own
```
src/services/document-generator.ts              # AI doc generation logic
src/ai/document-prompts.ts                      # Emergency card + doctor prep prompts
src/ai/document-schemas.ts                      # EmergencyCard + DoctorPrep Zod schemas
app/api/documents/emergency-card/route.ts       # POST: generate card
app/api/documents/doctor-prep/route.ts          # POST: generate prep
app/(protected)/emergency-card/page.tsx         # Generate + view card (auth required)
app/(protected)/doctor-prep/page.tsx            # Generate doctor prep (auth required)
app/emergency-card/[slug]/page.tsx              # PUBLIC shareable card (NO auth)
src/components/documents/*                      # All document UI components
src/hooks/use-documents.ts                      # Document state hook
```

## Files You Read (never edit)
```
src/ai/client.ts                # Anthropic provider
src/types/index.ts              # Shared types
src/lib/auth.ts                 # Auth helper
src/lib/prisma.ts               # DB client
```

---

## Task-by-Task Guide

### Task C1: Document Schemas (Hour 2-4)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person C, building Documents & Emergency.

Create src/ai/document-schemas.ts with Zod schemas:

1. EmergencyCardSchema:
   - headline: string (e.g., "John Doe — Long QT Syndrome Type 2")
   - criticalWarning: string (one sentence for ER doctors about what LQTS means)
   - drugsToAvoid: array of { category: string, examples: string[], reason: string }
     (e.g., { category: "Fluoroquinolone antibiotics", examples: ["Ciprofloxacin", "Moxifloxacin"], reason: "Block hERG potassium channel" })
   - safeAlternatives: array of { forCondition: string, safeDrug: string, notes: optional string }
     (e.g., { forCondition: "Bacterial infection", safeDrug: "Amoxicillin", notes: "No QT effect" })
   - currentMedications: array of { name: string, dosage: optional string, qtRisk: string }
   - emergencyProtocol: array of { step: number, instruction: string }
     (step-by-step for ER: check rhythm → IV Magnesium for TdP → do NOT give Amiodarone → etc.)
   - emergencyContacts: array of { name: string, phone: string, role: string }

2. DoctorPrepSchema:
   - title: string
   - patientSummary: string (brief about patient's LQTS type)
   - procedureDrugs: array of { drugName: string, qtSafety: 'SAFE' | 'CAUTION' | 'AVOID', reason: string, alternative: optional string }
   - generalPrecautions: array of strings
   - emergencyNote: string (what to do if TdP occurs during procedure)
```

### Task C2: Document Prompts (Hour 4-8)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person C, building Documents & Emergency.

Create src/ai/document-prompts.ts with prompt builder functions.

Define a DOCUMENT_SYSTEM_CONTEXT constant that establishes Claude as a medical document generator for LQTS patients. Rules: write for healthcare professionals, be specific and actionable, use standard medical terminology, include only information from the provided patient data.

buildEmergencyCardPrompt(profile): takes { name, genotype, medications (with risk), emergencyContacts }
- Instructs Claude to generate a structured emergency medical card
- Must be readable by an ER doctor in 30 seconds
- Focus on: what LQTS is, what drugs to NEVER give this patient (group by category), what drugs ARE safe, the patient's current medications, step-by-step emergency protocol for TdP, and contact info
- The drugsToAvoid section should focus on COMMON ER MEDICATIONS that are dangerous: certain antibiotics (fluoroquinolones, macrolides), antiemetics (ondansetron), antiarrhythmics (amiodarone), antipsychotics (haloperidol)

buildDoctorPrepPrompt(profile, procedureType): takes profile + procedure type string (e.g., "dental extraction", "minor surgery", "general anesthesia")
- Instructs Claude to generate a 1-page procedure-specific brief
- List COMMON DRUGS used in that specific procedure and rate each for QT safety
- Suggest safe alternatives for any dangerous ones
- Include procedure-specific precautions for LQTS patients
```

### Task C3: Document Generator Service (Hour 8-12)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person C, building Documents & Emergency.

Create src/services/document-generator.ts with two functions:

1. async function generateEmergencyCard(userId: string): Promise<EmergencyCardData>
   - Load from Prisma: user (name, genotype) + active medications (genericName, brandName, dosage, qtRisk) + emergency contacts (name, phone, relationship)
   - Call generateObject with EmergencyCardSchema and buildEmergencyCardPrompt
   - Temperature: 0
   - Return the validated structured data

2. async function generateDoctorPrep(userId: string, procedureType: string): Promise<DoctorPrepData>
   - Load same profile data
   - Call generateObject with DoctorPrepSchema and buildDoctorPrepPrompt
   - Temperature: 0
   - Return validated data

Error handling: if Claude fails, return a meaningful error message. Don't crash.
```

### Task C4: Emergency Card API + Page (Hour 12-18)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person C, building Documents & Emergency.

Create app/api/documents/emergency-card/route.ts:
- POST handler: auth check → call generateEmergencyCard(userId) → return JSON
- Also handle saving the card to DB for the shareable link (store the generated data with a unique slug in ScanLog or a new EmergencyCard model — your choice)

Create app/(protected)/emergency-card/page.tsx:
- "Generate My Emergency Card" button
- Loading state while Claude generates
- Once generated, render the structured data as a beautiful emergency card:
  - Dark red header with patient name + LQTS type
  - "CRITICAL WARNING" section in bold
  - "DRUGS TO AVOID" section with categories and examples
  - "SAFE ALTERNATIVES" section
  - "CURRENT MEDICATIONS" section
  - "EMERGENCY PROTOCOL" numbered steps
  - "EMERGENCY CONTACTS" at bottom
- Three action buttons:
  - "Download PDF" — generate PDF client-side from the structured data using jspdf
  - "Share Link" — creates public URL, shows it + copies to clipboard
  - "Show QR Code" — generates QR code pointing to the public URL

This should look PROFESSIONAL. Think of it as a real medical document that you'd trust with your life.
```

### Task C5: Public Shareable Card (Hour 18-22)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person C, building Documents & Emergency.

Create app/emergency-card/[slug]/page.tsx — this is a PUBLIC page, NO authentication required.

It loads the saved emergency card data by slug from the database and renders the same visual card as the protected version, but without any QTShield UI chrome (no nav, no dashboard links). Just the medical card.

At the top: "QTShield Emergency Medical Card" header
At the bottom: "This card was generated by QTShield (qtshield.app). Data source: CredibleMeds QTdrugs List."

This page must:
- Work without auth (ER doctors don't have accounts)
- Load fast (minimal JS, could be a server component)
- Be printable (good print CSS)
- Show all the same medical information as the protected version

This is CRITICAL for the demo — we'll show the QR code being scanned and the card appearing on another phone.
```

### Task C6: Doctor Visit Prep (Hour 22-28)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person C, building Documents & Emergency.

Create app/api/documents/doctor-prep/route.ts:
- POST handler: auth check → validate { procedureType: z.string() } → call generateDoctorPrep(userId, procedureType) → return JSON

Create app/(protected)/doctor-prep/page.tsx:
- Dropdown to select procedure type:
  - "Dental procedure (extraction, cleaning, root canal)"
  - "Minor surgery (local anesthesia)"
  - "Major surgery (general anesthesia)"
  - "Radiology (contrast agents, sedation)"
  - "General medical checkup"
  - "Psychiatric consultation"
- "Generate Brief" button
- Loading state
- Renders the structured DoctorPrepData as a professional document:
  - Title and patient summary
  - Table of procedure drugs with color-coded safety column (SAFE=green, CAUTION=yellow, AVOID=red)
  - For AVOID drugs: the safe alternative is shown
  - General precautions list
  - Emergency note highlighted
- "Download PDF" button
```

---

## When You Need Others

| What you need | From whom | When |
|---|---|---|
| User + medication data in DB for testing | Person B | After hour 12 — use their onboarding flow, or manually insert via Supabase dashboard |
| Nothing from Person A | — | Your code is fully independent |
| Nothing from Person D | — | Your code is fully independent |

## Testing Tip

Before Person B's onboarding is ready, manually create test data in Supabase dashboard:
- A User record with genotype 'LQT2'
- 3 Medications: Escitalopram (POSSIBLE_RISK), Metoprolol (NOT_LISTED), Omeprazole (NOT_LISTED)
- 2 EmergencyContacts: one cardiologist, one family

Then test emergency card generation with this data.
