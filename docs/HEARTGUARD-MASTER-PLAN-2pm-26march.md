# QTShield — Master Build Plan

> This document is the single source of truth for building QTShield.
> Read it fully before writing any code. Give it as context to Claude Code.

---

## What already exists in the repo

| Done | What |
|------|------|
| ✅ | Next.js 15.3 + TypeScript + Tailwind v4 project |
| ✅ | Supabase Auth middleware (middleware.ts — redirects unauth to /login) |
| ✅ | Prisma 7.5 + @prisma/adapter-pg (Supabase connection) |
| ✅ | PWA support (@ducanh2912/next-pwa) |
| ✅ | ESLint + Husky |
| ❌ | Prisma schema (only default, no QTShield models) |
| ❌ | Any app pages beyond defaults |
| ❌ | AI / Claude integration |
| ❌ | src/ directory structure (services, ai, types, data) |
| ❌ | qtdrugs.json data file |

---

## Phase 0: Foundation (ALL TOGETHER — first 2 hours)

Before anyone works on features, the team does these things together. This prevents integration hell later.

### 0.1 Install missing packages

```
npm install ai @ai-sdk/anthropic zod jspdf qrcode
npm install -D @types/qrcode
```

### 0.2 Create shared types file

Create `src/types/index.ts`. This file defines EVERY type that crosses boundaries between services, API routes, and frontend. All 4 people import from here. Nobody creates duplicate types.

Types to define: RiskCategory (4 values), ComboRiskLevel (4 values), Genotype (5 values), ScanType (3 values), RiskSource (2 values), ScanResult shape, PhotoScanResult shape, DrugInfo shape, QtDrugEntry shape (matching the JSON schema), EmergencyCardData shape, DoctorPrepData shape.

### 0.3 Write Prisma schema

Four models needed:

**User** — extends the Supabase auth user. Fields: id (uuid), supabaseId (unique string linking to Supabase auth), email, name, genotype (nullable string — LQT1/LQT2/LQT3/OTHER/UNKNOWN), onboarded (boolean default false), timestamps. Relations: has many Medications, ScanLogs, EmergencyContacts.

**Medication** — a drug the user currently takes. Fields: id, userId (FK to User), genericName, brandName (nullable), dosage (nullable), qtRisk (string — the RiskCategory), isDTA (boolean), cypData (Json — stored from qtdrugs.json at add time), active (boolean default true), addedAt timestamp. Index on userId.

**ScanLog** — history of every scan. Fields: id, userId (FK), drugName (what user typed), genericName (what we resolved), riskCategory, comboRisk (nullable), scanType (TEXT/PHOTO/PRESCRIPTION), alternatives (Json — stored suggestions), fullResult (Json — entire ScanResult for re-rendering), createdAt. Index on userId.

**EmergencyContact** — people to contact in emergency. Fields: id, userId (FK), name, phone, relationship (cardiologist/family/friend). Index on userId.

All tables use `@@map("table_name")` for snake_case DB names. All columns use `@map("column_name")`.

After writing: `npx prisma db push` + `npx prisma generate`.

### 0.4 Create directory structure

```
src/
  types/index.ts          ← shared types (done in 0.2)
  services/               ← business logic (Person A + B)
  ai/                     ← prompts, schemas, client (Person A)
  data/                   ← qtdrugs.json (Person D)
  components/             ← React components (Person C)
  hooks/                  ← custom hooks (Person C)
  lib/                    ← utilities (shared)
```

### 0.5 Create Claude AI client

Create `src/ai/client.ts` — exports the Anthropic provider instance from `@ai-sdk/anthropic`. Just the singleton, nothing else.

### 0.6 Create auth helper

Create `src/lib/auth.ts` — a helper function that reads the Supabase session from cookies in an API route or server component and returns the user (or null). The middleware already handles redirects; this helper is for API routes to get the current user's ID.

### 0.7 Verify auth flow works

Sign up → sign in → see protected page → sign out → get redirected. This MUST work before anyone starts features. Current middleware redirects to `/login`, so make sure that page exists and works with Supabase Auth UI.

### 0.8 Seed initial qtdrugs.json

Person D starts curating `src/data/qtdrugs.json` immediately. Minimum 20 drugs by end of Phase 0 for testing. Must include these test drugs: Ciprofloxacin (KNOWN_RISK), Moxifloxacin (KNOWN_RISK), Ondansetron (KNOWN_RISK), Clarithromycin (KNOWN_RISK, CYP3A4 inhibitor), Escitalopram (POSSIBLE_RISK), Metoprolol (NOT_LISTED, common LQTS med), Amoxicillin (NOT_LISTED, safe alternative), Azithromycin (KNOWN_RISK), Haloperidol (KNOWN_RISK), Domperidone (KNOWN_RISK).

Each entry MUST have: genericName, searchTerms array (brand names + common misspellings), riskCategory, isDTA, drugClass, primaryUse, qtMechanism, cyp object (metabolizedBy, inhibits, induces arrays).

---

## Phase 1: Core Scan Pipeline (Hours 2-16)

This is the HEART of the product. At the end of Phase 1, a user can type a drug name and see a colored risk result. Everything else builds on top of this.

### 1.1 Drug Lookup Service (Person A — Hour 2-4)

**What it does:** Pure function that searches qtdrugs.json by drug name. No AI. No API. Instant.

**Logic:** Takes a string query. Normalizes to lowercase. Searches three ways in order: (1) exact match on genericName, (2) exact match on any searchTerm, (3) partial match (startsWith) on genericName or searchTerms. Returns the QtDrugEntry or null.

**Also needed:** A `searchDrugs(query)` function that returns up to 5 matches for autocomplete in the UI.

**Tell Claude Code:** "Create src/services/drug-lookup.ts. It imports qtdrugs.json and exports two functions: lookupDrug(query: string) that returns a single QtDrugEntry or null using exact-then-fuzzy matching on genericName and searchTerms, and searchDrugs(query: string) that returns up to 5 partial matches for autocomplete. Both are pure synchronous functions. Use the QtDrugEntry type from src/types."

### 1.2 Combo Analysis AI (Person A — Hour 4-10)

**What it does:** Takes a new drug (from qtdrugs.json) + the user's current medications + genotype. Makes ONE Claude API call using `generateObject` with a Zod schema. Returns structured combo risk assessment + safe alternatives.

**Context engineering is critical here.** The prompt must:
- Include a medical system context explaining LQTS, QT prolongation, TdP risk, CYP450 interactions
- Set CONSERVATIVE rules — when in doubt, flag higher risk
- Inject ALL factual data: the new drug's QT risk + CYP profile, every current medication's QT risk + CYP profile, patient's genotype
- Ask for TWO outputs in one call: combo risk analysis AND alternative suggestions
- Require JSON output matching our Zod schema

**Temperature MUST be 0** — no creativity for medical advice.

**The Zod schema** defines: comboRisk (level enum, explanation string, interactions array with drug1/drug2/type/mechanism, additiveQTCount number), alternatives array (genericName, drugClass, whySafer, caveats).

**Tell Claude Code:** "Create src/ai/schemas.ts with Zod schemas for ComboAnalysis, DetectedDrugs, EmergencyCard, DoctorPrep, and UnknownDrug responses. Then create src/ai/prompts.ts with prompt builder functions. The combo prompt must inject: system context about LQTS pharmacology, patient genotype, all current medications with their QT risk and CYP data from our JSON, the new drug with its QT risk and CYP data. Use temperature 0. Use generateObject from the 'ai' package with the anthropic provider."

### 1.3 Drug Scanner Service (Person A — Hour 10-14)

**What it does:** The main orchestration function `scanDrugByText(drugName, userId)`.

**Logic flow:**
1. Call `lookupDrug(drugName)` — instant, local
2. If not found → call Claude with unknown drug prompt → return AI_ASSESSED result
3. If found → build base result from JSON data (risk category, mechanism, etc.)
4. If risky (anything except NOT_LISTED) AND user has medications in DB → load medications from Prisma → call combo analysis AI → attach results
5. If safe (NOT_LISTED) → no AI call needed at all, instant green result
6. Save scan to ScanLog table
7. Return complete ScanResult

**Tell Claude Code:** "Create src/services/drug-scanner.ts with async function scanDrugByText(drugName: string, userId: string): Promise<ScanResult>. It first calls lookupDrug for local search. If not found, uses Claude to assess. If found and risky, loads user medications from Prisma and calls the combo analysis AI. If safe, returns immediately with no AI call. Always saves to scan_logs table. Handle all errors gracefully — if Claude fails, return the local lookup result with a note that combo analysis is unavailable."

### 1.4 Text Scan API Route (Person B — Hour 10-14)

**What it does:** Thin wrapper. Validates input with Zod, gets auth user, calls scanDrugByText, returns JSON.

**Route:** POST `/api/scan/text`. Accepts `{ drugName: string }`. Returns ScanResult.

**Tell Claude Code:** "Create app/api/scan/text/route.ts. POST handler that: validates body with Zod (drugName: string, min 2, max 100), gets authenticated user via our auth helper, calls scanDrugByText from services, returns the result as JSON. Handle errors with proper status codes: 401 for unauth, 400 for bad input, 500 for service errors."

### 1.5 Scan Page UI (Person C — Hour 8-16)

**What it does:** The main scan interface. Text input with autocomplete + camera button + results display.

**UX flow:**
1. Big text input at top: "Type medication name..."
2. As user types, show autocomplete dropdown (calls searchDrugs locally — this should be a client-side import of a search function OR a lightweight API)
3. User selects drug or hits search
4. Loading state (pulsing animation, 2-3 seconds max)
5. Result appears: full-screen colored card
   - GREEN header = NOT_LISTED → "This medication is not known to prolong QT. Likely safe."
   - YELLOW header = POSSIBLE/CONDITIONAL → "This medication has possible QT risk. Discuss with your cardiologist."
   - RED header = KNOWN_RISK or DTA → "DANGER: This medication is known to prolong QT. Do NOT take without cardiologist approval."
6. Below the header: combo risk section (if applicable), alternatives (if risky), "Show to Doctor" button

**Tell Claude Code:** "Create app/(protected)/scan/page.tsx with a drug search interface. Use the useDrugScan custom hook for state management. Show autocomplete suggestions as user types. On submission, call POST /api/scan/text. Display results with color-coded cards: green for safe, yellow for possible risk, red for known risk. Include a combo risk section and alternatives section when they exist. Mobile-first design, large touch targets."

### CHECKPOINT 1 (Hour 16)
Team syncs. The text scan flow should work end-to-end: type "Cipro" → see red card with risk info. Type "Amoxicillin" → see green card. This is the core demo.

---

## Phase 2: Profile & Medications (Hours 16-28)

### 2.1 Onboarding Flow (Person B + C — Hour 16-22)

**What it does:** 3-step wizard that new users complete after first login.

**Step 1 — Genotype:** "What is your LQTS type?" Radio buttons: LQT1, LQT2, LQT3, Other, I don't know. Brief explanation of each. "Not sure? Choose 'I don't know' — QTShield will use general LQTS safety guidelines."

**Step 2 — Current Medications:** "What medications do you currently take?" Text input with autocomplete (same as scan). For each added drug, show QT risk badge (run it through lookupDrug). Store with CYP data from JSON.

**Step 3 — Emergency Contacts:** "Add your cardiologist and one family member." Name + phone + relationship for each. Minimum 1 required.

**On completion:** Set user.onboarded = true, redirect to /dashboard.

**Tell Claude Code (Person B):** "Create app/api/onboarding/route.ts. POST handler that accepts genotype, medications array, and emergency contacts. Creates/updates the User record, creates Medication records (with qtRisk and cypData from lookupDrug), creates EmergencyContact records. All in one Prisma transaction. Sets onboarded=true."

**Tell Claude Code (Person C):** "Create app/(protected)/onboarding/page.tsx with a 3-step wizard. Step 1: genotype selection with radio buttons. Step 2: add medications with autocomplete and QT risk preview. Step 3: emergency contacts form. Submit all data to POST /api/onboarding on completion. Redirect to /dashboard."

### 2.2 My Medications Page (Person B + C — Hour 22-28)

**What it does:** Shows all current medications with QT risk badges. Add/remove medications. Shows overall combo risk.

**Logic for adding:** When user adds a new medication, run it through the same scan pipeline (lookupDrug → combo check vs all current meds). Save to DB with risk data.

**Logic for removing:** Soft delete (set active=false). Recalculate combo display.

**Display:** List of medications, each with colored dot (green/yellow/red based on qtRisk). At top: overall combo assessment. If user has 2+ QT-prolonging drugs, show warning.

### CHECKPOINT 2 (Hour 28)
New user can: sign up → complete onboarding → see dashboard → scan drugs → manage medications. This is already a functional product.

---

## Phase 3: Documents (Hours 28-38)

### 3.1 Emergency Card (Person A + C — Hour 28-34)

**What it does:** AI generates structured emergency medical card content. Frontend renders it as a visual card + downloadable PDF.

**Logic:** Load full user profile (name, genotype, medications with risk, emergency contacts) from DB. ONE Claude call with generateObject to produce structured content: headline, critical warning, drugs to avoid categories, safe ER medications, current medications list, emergency protocol steps, contacts.

**Frontend:** Beautiful card view (dark red header for urgency). Three buttons: Download PDF, Share Link, Show QR Code.

**Share Link:** Save card data to a new DB record with unique slug. Public route `/emergency-card/[slug]` renders the card WITHOUT requiring auth — an ER doctor must be able to see it.

### 3.2 Doctor Visit Prep (Person A + C — Hour 34-38)

**What it does:** User selects procedure type (dental, minor surgery, radiology, general checkup, etc.). AI generates a 1-page brief for the doctor.

**Logic:** Same pattern as Emergency Card — load profile, ONE Claude call, structured output. The prompt includes the procedure type and asks Claude to list common drugs used in that procedure with their QT safety for this patient.

**Frontend:** Dropdown to select procedure → generate button → loading → rendered document → download PDF button.

### CHECKPOINT 3 (Hour 38)
Full feature set works: scan, onboarding, medications, emergency card, doctor prep. Time to polish.

---

## Phase 4: Photo Scan + Polish (Hours 38-50)

### 4.1 Photo Scan (Person A — Hour 38-42)

**What it does:** User takes photo of medication box. Claude Vision reads the drug names. Then runs standard text scan for each.

**Logic:** ONE Claude Vision call with generateObject. Input: base64 image. Output: array of detected drug names + confidence levels + image quality assessment. Then for each detected drug, call scanDrugByText in parallel (Promise.all).

**API route:** POST `/api/scan/photo`. Accepts `{ image: string }` (base64). Returns PhotoScanResult.

**Frontend addition:** Camera button on scan page. Captures photo, converts to base64, sends to API. Shows multiple results if multiple drugs detected.

### 4.2 Dashboard Page (Person C — Hour 38-44)

**What it does:** Home screen after login. Shows: user's genotype badge, medication count with overall risk indicator, big SCAN button, recent scan history (last 5), quick access to Emergency Card.

**Logic:** Server component that loads user profile + recent scans from DB.

### 4.3 Scan History Page (Person C — Hour 44-48)

**What it does:** Chronological list of all past scans. Each entry shows: drug name, risk color, date, scan type (text/photo). Tap to see full result.

**Logic:** Load ScanLogs from DB for this user, ordered by createdAt desc. Each log has fullResult JSON, so tapping it renders the full ScanResult view.

### 4.4 Settings Page (Person C — Hour 48-50)

**What it does:** Edit genotype, name, emergency contacts. Not complex — simple form that updates the user record.

### CHECKPOINT 4 (Hour 50)
Everything works. All features complete. Time to prepare the demo.

---

## Phase 5: Demo Prep (Hours 50-60)

### 5.1 Landing Page (Person D — Hour 50-54)

**What it does:** Public landing page at `/`. Explains what QTShield is. The "3 seconds vs 3 hours" pitch. Sign Up CTA. This is the first thing the judges see.

**Sections:** Hero ("Your heart medication guardian"), Problem statement (190+ dangerous drugs, 14 pulled from market), How it works (3 steps: scan → check → safe), Sign up button.

### 5.2 End-to-End Testing (Person D — Hour 50-56)

Run through ALL test scenarios:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Type "Cipro" | RED — Known Risk, DTA |
| 2 | Type "Amoxicillin" | GREEN — Not Listed |
| 3 | Type "Escitalopram" with no other meds | YELLOW — Possible Risk, no combo |
| 4 | Add Escitalopram to medications, then scan "Clarithromycin" | RED — Known Risk + CRITICAL combo (CYP3A4) |
| 5 | Type "asdfgh" | Not found — AI assessment |
| 6 | Type "Cipro" (partial) | Autocomplete shows Ciprofloxacin |
| 7 | Photo of Cipro box | Vision detects, same as #1 |
| 8 | Generate Emergency Card | PDF with all patient data |
| 9 | Generate Doctor Prep for dental extraction | PDF with procedure-specific drugs |
| 10 | Share Emergency Card link | Public page loads without auth |

### 5.3 Demo Script (Person D — Hour 56-58)

Minute-by-minute script for 5-minute demo:
- **0:00-1:00** — The problem. "190+ medications can stop your heart. 14 already pulled from market. 1 in 3,000 people have LQTS. 12% die without warning."
- **1:00-2:00** — Meet Maria. 19, student, LQT2. Got flu, doctor prescribed Moxifloxacin, heart stopped. She survived. 30% don't.
- **2:00-4:00** — Live demo. Onboarding → scan Moxifloxacin (RED) → scan Amoxicillin (GREEN) → add Escitalopram, scan Clarithromycin (COMBO CRITICAL) → show Emergency Card → share link
- **4:00-5:00** — Vision. Smartwatch integration. Multi-condition platform. "3 seconds to save a life."

### 5.4 Dress Rehearsal (ALL — Hour 58-60)

Full demo run-through 2 times. Fix any last issues.

---

## Person Assignments Summary

### Person A — AI & Services
Works in: `src/services/`, `src/ai/`, `src/data/`
Never touches: page UI components

| Phase | Task | Hours |
|-------|------|-------|
| 0 | AI client setup, help with types | 0-2 |
| 1 | drug-lookup.ts, combo AI prompts + schemas, drug-scanner.ts | 2-16 |
| 3 | document-generator.ts (emergency card + doctor prep) | 28-38 |
| 4 | photo-scanner.ts (Vision) | 38-42 |
| 5 | Prompt tuning based on test results | 42-50 |

### Person B — Backend & Data Layer
Works in: `prisma/`, `app/api/`, `src/lib/`
Never touches: AI prompts, UI components

| Phase | Task | Hours |
|-------|------|-------|
| 0 | Prisma schema, auth helper, db push | 0-2 |
| 1 | API route: /api/scan/text | 10-16 |
| 2 | API routes: /api/onboarding, /api/medications | 16-28 |
| 3 | API routes: /api/documents/*, public emergency card route | 28-38 |
| 4 | API route: /api/scan/photo, error handling, edge cases | 38-50 |

### Person C — Frontend & UX
Works in: `app/(protected)/`, `src/components/`, `src/hooks/`
Never touches: services, AI code, API internals

| Phase | Task | Hours |
|-------|------|-------|
| 0 | Design tokens (colors, typography), layout skeleton | 0-2 |
| 1 | Scan page + results display + useDrugScan hook | 8-16 |
| 2 | Onboarding wizard + My Medications page | 16-28 |
| 3 | Emergency Card view + Doctor Prep page | 28-38 |
| 4 | Dashboard, History, Settings, camera UI, polish | 38-50 |
| 5 | Final mobile QA, animations, loading states | 50-56 |

### Person D — Data & Product
Works in: `src/data/`, demo materials, testing
Never touches: application code (unless fixing bugs)

| Phase | Task | Hours |
|-------|------|-------|
| 0 | Start qtdrugs.json (20 drugs minimum) | 0-4 |
| 1 | Expand to 50+ drugs, add CYP interaction data | 4-16 |
| 2 | Expand to 100+ drugs, start writing test scenarios | 16-28 |
| 3 | Reach 150+ drugs, test document generation | 28-38 |
| 4 | Full 190+ drugs, end-to-end testing, bug reporting | 38-50 |
| 5 | Landing page content, pitch deck, demo script, rehearsal | 50-60 |

---

## Integration Points (When People Must Sync)

| When | Who | What to verify |
|------|-----|----------------|
| Hour 2 | ALL | Types file agreed, Prisma schema pushed, auth works |
| Hour 16 | A + B | drug-scanner.ts output matches API route expectations |
| Hour 16 | B + C | API response shape matches frontend ScanResult type |
| Hour 28 | ALL | Full scan flow works: type → API → result renders correctly |
| Hour 38 | ALL | Onboarding + medications + combo check + documents all work |
| Hour 50 | ALL | Photo scan + all features complete. Start demo prep. |
| Hour 58 | ALL | Dress rehearsal. Everything works on deployed Vercel URL. |

---

## Key Architecture Decisions (Reference)

**Why no agent framework:** Our flows are FIXED (lookup → check → analyze → suggest). No runtime decision-making needed. generateObject with Zod gives type-safe AI outputs. Adding an orchestrator adds latency, complexity, and failure points.

**Why local JSON instead of CredibleMeds API:** Zero-latency lookups. Works offline (PWA). No external dependency during demo. CredibleMeds API requires commercial license for real-time access.

**Why ONE combo call instead of separate analysis + alternatives:** Halves latency. Single Claude call returns both in structured JSON. The prompt provides all facts; Claude does all reasoning in one pass.

**Why temperature 0 everywhere:** Medical safety. We need deterministic, conservative responses. Same input must produce same output every time.

**Why Vercel AI SDK generateObject:** Guarantees Zod-validated output. If Claude returns malformed JSON, SDK retries automatically. Type-safe from AI response all the way to frontend.

---

## Middleware Note

Current middleware redirects ALL unauthenticated requests to `/login` (except static assets). This needs adjustment:

**Must be PUBLIC (no auth):** `/`, `/login`, `/sign-up`, `/emergency-card/[slug]`
**Must be PROTECTED:** everything under `/(protected)/`

Update the middleware matcher and redirect logic to handle this. The emergency card public route is critical — an ER doctor must access it without logging in.

---

## Environment Variables Needed

```
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key
NEXT_PUBLIC_SUPABASE_URL=https://...  # Already set
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Already set
DATABASE_URL=postgresql://...          # Already set
DIRECT_URL=postgresql://...            # Already set (for Prisma)
```

Only ONE new env var needed: `ANTHROPIC_API_KEY`. Everything else exists.
