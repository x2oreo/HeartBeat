# QTShield — Person A: Scan Engine

## Your Role
You own the CORE product feature — the medication scan. When a user types a drug name or takes a photo, YOUR code decides whether it's dangerous, analyzes combinations with their current meds, and suggests safe alternatives. This is 80% of the demo and 80% of the product value.

## What Others Are Building

**Person B (Profile)** builds onboarding and medication management. They create the User records with genotype and the Medication records in the database. Your combo analyzer READS this data — you load the user's medications from Prisma to check combinations. You don't create this data, Person B does.

**Person C (Documents)** builds Emergency Card and Doctor Prep. They have their OWN AI prompts and schemas in separate files (document-prompts.ts, document-schemas.ts). You never touch those files, they never touch yours.

**Person D (Data)** curates qtdrugs.json — the drug database your lookup depends on. They also build the history page that displays YOUR scan results. They read from the ScanLog table that your scanner writes to.

## How Your Work Connects

```
Person D creates qtdrugs.json
       ↓
Your drug-lookup.ts searches it (created in Phase 0, you READ it)
       ↓
Your drug-scanner.ts orchestrates the scan:
  1. Calls lookupDrug() → instant local result
  2. If risky → loads Person B's medication data from DB
  3. Calls YOUR combo AI → Claude analyzes + suggests alternatives
  4. Saves to ScanLog → Person D's history page reads this
       ↓
Your API route returns ScanResult
       ↓
Your scan page UI renders the color-coded result
```

## Files You Own
```
src/ai/scan-prompts.ts              # YOUR prompts — combo analysis + unknown drug
src/ai/scan-schemas.ts              # YOUR Zod schemas — ComboAnalysis, DetectedDrugs, UnknownDrug
src/services/drug-scanner.ts        # Core: scanDrugByText()
src/services/photo-scanner.ts       # Photo: scanDrugByPhoto()
app/api/scan/text/route.ts          # POST endpoint for text scan
app/api/scan/photo/route.ts         # POST endpoint for photo scan
app/(protected)/scan/page.tsx       # The scan page UI
src/components/scan/*               # All scan-related components
src/hooks/use-drug-scan.ts          # Frontend state hook for scan
```

## Files You Read (never edit)
```
src/services/drug-lookup.ts         # Person D created in Phase 0
src/data/qtdrugs.json               # Person D maintains
src/ai/client.ts                    # Created in Phase 0
src/types/index.ts                  # Shared types
src/lib/auth.ts                     # Auth helper
src/lib/prisma.ts                   # DB client
```

---

## Task-by-Task Guide

### Task A1: AI Schemas (Hour 2-4)

This is the foundation for all your AI calls. Get the schemas right and everything else flows.

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person A, building the Scan Engine.

Create src/ai/scan-schemas.ts with these Zod schemas:

1. ComboAnalysisSchema — the response when Claude analyzes a drug combination:
   - comboRisk object: level (enum LOW/MEDIUM/HIGH/CRITICAL), explanation (string — plain language why this combo is dangerous), interactions array (each with drug1, drug2, type enum ADDITIVE_QT/CYP_INHIBITION/CYP_INDUCTION/OTHER, mechanism string, clinicalSignificance string), additiveQTCount (number — how many current meds also prolong QT)
   - alternatives array: each with genericName, brandName (optional), drugClass, whySafer (string), caveats (optional string)

2. DetectedDrugsSchema — the response when Claude Vision reads a medication photo:
   - drugs array: each with name (string), dosage (optional string), confidence (HIGH/MEDIUM/LOW)
   - imageQuality: CLEAR/PARTIAL/UNREADABLE
   - notes: optional string

3. UnknownDrugSchema — the response when a drug isn't in our database:
   - isRealDrug boolean
   - genericName (optional), drugClass (optional), primaryUse (optional)
   - qtRiskAssessment: LIKELY_SAFE/POSSIBLE_RISK/UNKNOWN/NOT_A_DRUG
   - reasoning string
   - recommendation string

Import from 'zod'. Use .describe() on fields to help Claude understand what we expect.
```

### Task A2: AI Prompts (Hour 4-8)

This is THE HARDEST AND MOST IMPORTANT task in the entire project. The quality of these prompts determines whether QTShield gives life-saving advice or dangerous misinformation. Take your time.

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person A, building the Scan Engine.

Create src/ai/scan-prompts.ts with prompt builder functions.

First, define a SYSTEM_CONTEXT constant. This is the medical system prompt shared by all scan-related AI calls. It must establish:
- Claude is a cardiac pharmacology AI specialized in LQTS medication safety
- CRITICAL RULES: be conservative (flag higher risk when uncertain), use ONLY the factual drug data provided in the prompt for QT risk categories (don't rely on training data), explain in plain language, never diagnose or prescribe
- MEDICAL CONTEXT: QTc >500ms is high-risk, additive QT prolongation is multiplicative not just additive, CYP450 inhibition increases plasma levels amplifying QT effect, electrolyte depletion compounds risk, genotype-specific triggers (LQT1=exercise/swimming, LQT2=auditory/emotion, LQT3=sleep/rest)

Then create these functions:

buildComboPrompt(newDrug: QtDrugEntry, currentMeds: MedicationWithCyp[], genotype: string | null): string
- Injects SYSTEM_CONTEXT
- Injects patient genotype
- Lists ALL current medications with their QT risk category + CYP profile (metabolizedBy, inhibits, induces) from our data
- Lists the new drug with its full profile from our data
- Asks Claude to analyze COMBO RISK (additive QT + CYP interactions) AND suggest 2-3 safer alternatives in one response

buildUnknownDrugPrompt(drugName: string): string
- For drugs not in our qtdrugs.json
- Asks Claude: is this a real medication? Does it have QT risk? What class?
- Must be conservative — if unsure, recommend checking with cardiologist

Import types from src/types/index.ts.
```

**After Claude Code generates the prompts, TEST THEM manually:**
1. Copy the combo prompt into Claude.ai chat with test data
2. Verify the response matches your Zod schema
3. Iterate on the prompt until results are consistently good
4. Test edge cases: drug with no CYP data, patient with no genotype, patient on 0 meds, patient on 5+ meds

### Task A3: Drug Scanner Service (Hour 8-12)

This is the orchestration function that ties everything together.

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person A, building the Scan Engine.

Create src/services/drug-scanner.ts with this main function:

async function scanDrugByText(drugName: string, userId: string): Promise<ScanResult>

The logic flow:
1. Call lookupDrug(drugName) from src/services/drug-lookup.ts — this is instant, local JSON search
2. If NOT found in our database:
   - Make one generateObject call with UnknownDrugSchema and buildUnknownDrugPrompt
   - Return result with source: 'AI_ASSESSED'
   - Save to ScanLog
3. If FOUND:
   - Build base result from the JSON data (genericName, brandNames, riskCategory, isDTA, mechanism)
   - Set source: 'CREDIBLEMEDS_VERIFIED'
   - If riskCategory is NOT 'NOT_LISTED' AND user has active medications in DB:
     a. Load user from Prisma with: genotype + active medications (select genericName, qtRisk, isDTA, cypData)
     b. If user has medications: make ONE generateObject call with ComboAnalysisSchema and buildComboPrompt
     c. Attach comboRisk and alternatives to result
   - If drug is 'NOT_LISTED': no AI call needed, instant green result
4. Save to ScanLog table with fullResult as JSON
5. Return ScanResult

Error handling is CRITICAL:
- If Claude call fails (timeout, error): return the local lookup result with a note "comboAnalysisUnavailable: true". Never crash because AI failed.
- If Prisma fails to load meds: skip combo analysis, return local result only.
- If Prisma fails to save log: still return the result to user, log the error server-side.

Use generateObject from 'ai' package with the anthropic provider from src/ai/client.ts.
Temperature: 0 for all calls.

Also export the ScanResult type and any helper types needed.
```

### Task A4: Scan API Route (Hour 12-13)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person A, building the Scan Engine.

Create app/api/scan/text/route.ts — a thin POST handler:
1. Get authenticated user via the auth helper from src/lib/auth.ts — return 401 if not authenticated
2. Parse and validate body with Zod: { drugName: z.string().min(2).max(100) } — return 400 if invalid
3. Call scanDrugByText(body.drugName, user.id) from src/services/drug-scanner.ts
4. Return the ScanResult as JSON
5. Catch errors: return 500 with { error: 'Scan failed. Please try again.' }

Keep it thin. All logic is in the service.
```

### Task A5: Scan Page UI (Hour 13-16)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person A, building the Scan Engine.

Create src/hooks/use-drug-scan.ts — a React hook that manages scan state:
- result: ScanResult | null
- loading: boolean
- error: string | null
- scanText(drugName: string): calls POST /api/scan/text, sets result
- reset(): clears state

Then create app/(protected)/scan/page.tsx — the main scan page:

1. Big search input at top: "Search medication name..." 
   - As user types, show autocomplete dropdown. For autocomplete, create a small API route or import drug data client-side.
   - Debounce the search 300ms
2. Submit button (or enter key) triggers the scan
3. Loading state: pulsing animation or skeleton
4. Result display — full-width color-coded card:
   - GREEN (#22c55e) background for NOT_LISTED: "✓ This medication is not on the QT risk list"
   - YELLOW (#eab308) for POSSIBLE_RISK or CONDITIONAL_RISK: "⚠ Possible QT risk — discuss with your cardiologist"
   - RED (#ef4444) for KNOWN_RISK or isDTA: "✕ DANGER — This medication can prolong QT interval"
5. Below the color card:
   - Drug info: generic name, drug class, QT mechanism
   - Combo risk section (if exists): combo level badge + explanation + specific interactions
   - Alternatives section (if drug is risky): list of 2-3 safer alternatives with why they're safer
   - Source badge: "Verified by CredibleMeds" or "AI Assessment"
6. "Show to Doctor" button — opens a clean printable view
7. Medical disclaimer at the bottom of every result

Mobile-first design. Big touch targets. The result card should be readable at arm's length — this is used in moments of stress.
```

### Task A6: Photo Scanner (Hour 16-22)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person A, building the Scan Engine.

Create src/services/photo-scanner.ts:

async function scanDrugByPhoto(imageBase64: string, userId: string): Promise<PhotoScanResult>

1. One Claude Vision call using generateObject with DetectedDrugsSchema
   - Send the image with instructions to extract ALL medication names visible
   - If imageQuality is 'UNREADABLE', return an error result
2. For each detected drug, call scanDrugByText() in parallel using Promise.all
   - Wrap each in try/catch so one failure doesn't kill the whole batch
3. Return { detectedDrugs, scanResults, imageQuality }

Then create app/api/scan/photo/route.ts — POST handler accepting { image: string } (base64).

Then add camera functionality to the scan page:
- "Take Photo" button that opens the device camera
- Capture photo → convert to base64 → call /api/scan/photo
- Show results for each detected drug
- If camera not available, show "Camera not supported" message
```

### Task A7: Prompt Optimization (Hour 22-28)

No new code. Test your prompts with real scenarios:

1. Scan Moxifloxacin with no current meds → should show KNOWN_RISK, DTA, no combo
2. Scan Clarithromycin with Escitalopram as current med → should detect CYP3A4 interaction, show CRITICAL combo
3. Scan Amoxicillin → instant green, no AI call
4. Scan "Xylometazoline" (not in JSON) → AI fallback, should assess as likely safe
5. Scan "asdfgh" → AI should say "not a real medication"
6. Scan Ondansetron with 3 QT-prolonging current meds → should show high additive QT count
7. Photo of Cipro box → should detect "Ciprofloxacin"
8. Photo of blurry/unreadable image → should return "could not read"

Fix prompts until ALL 8 scenarios work reliably. This is worth spending hours on.

---

## When You Need Others

| What you need | From whom | When |
|---|---|---|
| qtdrugs.json with more drugs | Person D | Ongoing — they keep adding drugs |
| User medication data in DB (for testing combo) | Person B | After hour 8 — use Supabase dashboard to manually create test data before then |
| Emergency card uses your scan data format | Person C | They read ScanLog, no action needed from you |

## Tip for Testing Before Person B's Onboarding Works

You need user medications in the DB to test combo analysis. Before Person B finishes onboarding, manually insert test data through Supabase dashboard or a quick seed script:
- Create a test user with genotype 'LQT2'
- Add 2 medications: Escitalopram (POSSIBLE_RISK) and Metoprolol (NOT_LISTED)
- Now scan Clarithromycin and verify the combo detection works
