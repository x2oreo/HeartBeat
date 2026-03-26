# HeartGuard

## What is HeartGuard?

HeartGuard is an AI-powered medication safety app for people with Long QT Syndrome (LQTS). LQTS is a heart condition affecting 1 in 3,000-5,000 people where certain medications can cause fatal cardiac arrhythmias. Over 190 common medications (antibiotics, antidepressants, antihistamines, pain medications) can prolong the QT interval and trigger sudden cardiac death in these patients.

HeartGuard lets patients scan any medication before taking it and instantly see whether it's dangerous for them, whether it interacts with their current medications, and what safer alternatives exist.

## Core User Flow

1. User types a drug name or takes a photo of a medication box
2. System looks up the drug in our local QT risk database (instant, no API call)
3. If the drug is risky AND user has other medications, Claude AI analyzes the combination risk and suggests safe alternatives (one API call)
4. User sees color-coded result: GREEN (safe), YELLOW (caution), RED (danger) with explanation
5. User can generate an Emergency Card PDF to carry or share with doctors

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
npx prisma db push   # Push schema changes to Supabase
npx prisma generate  # Regenerate Prisma client after schema changes
```

## Tech Stack

- **Framework:** Next.js 15.3 with App Router + TypeScript 5.9 (strict)
- **UI:** React 19 + Tailwind CSS v4
- **Database:** Prisma 7.5 + Supabase PostgreSQL
- **Auth:** Supabase Auth with SSR (@supabase/ssr)
- **AI:** Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) using `generateObject` with Zod validation
- **PWA:** @ducanh2912/next-pwa
- **PDF:** jspdf for Emergency Card / Doctor Prep generation
- **Deploy:** Vercel (auto-deploy from main branch)

## Project Structure

```
app/
  (auth)/
    login/page.tsx                  # Supabase Auth login
    signup/page.tsx                 # Supabase Auth signup
  (protected)/                      # All pages here require auth
    dashboard/page.tsx              # Home screen: risk overview + SCAN button
    scan/page.tsx                   # Main scan: text input + camera
    scan/results/[id]/page.tsx      # Full scan result view
    medications/page.tsx            # My Medications list with QT risk badges
    emergency-card/page.tsx         # Generate + view Emergency Card
    doctor-prep/page.tsx            # Generate Doctor Visit Prep document
    history/page.tsx                # Past scan history timeline
    onboarding/page.tsx             # First-time setup: genotype → meds → contacts
    settings/page.tsx               # Edit profile, genotype, contacts
  emergency-card/[slug]/page.tsx    # PUBLIC (no auth) — shareable emergency card
  api/
    scan/text/route.ts              # POST — text drug scan
    scan/photo/route.ts             # POST — photo drug scan (Claude Vision)
    medications/route.ts            # GET/POST/DELETE — medication CRUD
    documents/emergency-card/route.ts   # POST — generate emergency card
    documents/doctor-prep/route.ts      # POST — generate doctor prep
    onboarding/route.ts             # POST — save onboarding data
  page.tsx                          # PUBLIC landing page
  layout.tsx                        # Root layout

src/
  services/                         # Business logic — ALL core logic lives here
    drug-lookup.ts                  # lookupDrug() — searches qtdrugs.json, NO API calls
    drug-scanner.ts                 # scanDrugByText() — main scan orchestration
    photo-scanner.ts                # scanDrugByPhoto() — Claude Vision + text scans
    document-generator.ts           # generateEmergencyCard(), generateDoctorPrep()

  ai/                               # Everything AI-related
    client.ts                       # Anthropic provider singleton
    schemas.ts                      # ALL Zod schemas for Claude responses
    prompts.ts                      # ALL prompt builder functions

  data/
    qtdrugs.json                    # 190+ drugs from CredibleMeds with risk + CYP data

  types/
    index.ts                        # ALL shared TypeScript types — single source of truth

  components/                       # React components organized by feature
    scan/                           # Scan-related components
    medications/                    # Medication list components
    documents/                      # Emergency card, doctor prep views
    onboarding/                     # Onboarding wizard steps
    dashboard/                      # Dashboard widgets
    ui/                             # Shared primitives (buttons, cards, inputs)

  hooks/                            # Custom React hooks
    use-drug-scan.ts                # Manages scan state + API calls
    use-medications.ts              # Manages medication list state

  lib/
    prisma.ts                       # Prisma client singleton
    auth.ts                         # Helper to get current user from Supabase session
    utils.ts                        # General utilities

prisma/
  schema.prisma                     # Database schema

middleware.ts                       # Supabase Auth — protects routes
```

## Architecture: How AI Works in HeartGuard

### The Rule: Inject FACTS, Let Claude REASON

We do NOT use agent frameworks, orchestrators, or tool-use loops. We use Vercel AI SDK `generateObject` with Zod schemas for type-safe, validated AI responses.

The drug risk data comes from our local JSON file (facts from CredibleMeds). The patient's medications and genotype come from our database (facts). Claude receives ALL facts in the prompt and does ONE thing: reason about drug combinations and suggest alternatives.

### When Claude is called vs when it isn't

| Situation | Claude API calls | Why |
|-----------|-----------------|-----|
| User scans a SAFE drug (not in QT list) | **0 calls** | Local JSON lookup only. Instant green result. |
| User scans a RISKY drug, has NO other medications | **0 calls** | Local JSON lookup gives risk category. No combo to analyze. |
| User scans a RISKY drug, HAS other medications | **1 call** | Combo analysis + alternatives in a single generateObject call. |
| User scans via photo | **1 call** (Vision) + above | Vision reads drug names, then each runs through text scan logic. |
| User generates Emergency Card | **1 call** | Generates structured card content from profile data. |
| User generates Doctor Prep | **1 call** | Generates procedure-specific drug safety brief. |

### All AI calls use temperature: 0
Medical safety requires deterministic, conservative responses. Same input → same output.

### Every AI response is Zod-validated
`generateObject` guarantees the response matches the schema. If Claude returns bad format, SDK retries automatically.

## Database Models

**User** — id, supabaseId (links to Supabase Auth), email, name, genotype (LQT1/LQT2/LQT3/OTHER/UNKNOWN, nullable), onboarded (boolean). Has many: Medications, ScanLogs, EmergencyContacts.

**Medication** — id, userId, genericName, brandName, dosage, qtRisk (KNOWN_RISK/POSSIBLE_RISK/CONDITIONAL_RISK/NOT_LISTED), isDTA (boolean), cypData (JSON — CYP450 profile stored from qtdrugs.json at add time), active (boolean). Indexed on userId.

**ScanLog** — id, userId, drugName (raw input), genericName (resolved), riskCategory, comboRisk (nullable), scanType (TEXT/PHOTO), alternatives (JSON), fullResult (JSON — entire result for re-rendering), createdAt. Indexed on userId.

**EmergencyContact** — id, userId, name, phone, relationship (cardiologist/family/friend). Indexed on userId.

All tables: `@@map("snake_case_table")`. All columns: `@map("snake_case_column")`.

## Shared Types (src/types/index.ts)

This file is the SINGLE SOURCE OF TRUTH for all types that cross service/API/frontend boundaries. Every developer imports from here. Never duplicate these types.

Key types to define:
- `RiskCategory`: `'KNOWN_RISK' | 'POSSIBLE_RISK' | 'CONDITIONAL_RISK' | 'NOT_LISTED'`
- `ComboRiskLevel`: `'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`
- `Genotype`: `'LQT1' | 'LQT2' | 'LQT3' | 'OTHER' | 'UNKNOWN'`
- `ScanType`: `'TEXT' | 'PHOTO'`
- `RiskSource`: `'CREDIBLEMEDS_VERIFIED' | 'AI_ASSESSED'`
- `ScanResult`: the complete result object returned by scanDrugByText
- `QtDrugEntry`: the shape of each entry in qtdrugs.json
- `ComboAnalysisResult`: the shape returned by the combo AI call
- `EmergencyCardData`: the shape returned by emergency card generation
- `DoctorPrepData`: the shape returned by doctor prep generation

## qtdrugs.json Data Schema

Each entry in `src/data/qtdrugs.json`:
```
{
  "genericName": "ciprofloxacin",
  "searchTerms": ["cipro", "ciproxin", "ciprobay", "ciprofloxacin"],
  "riskCategory": "KNOWN_RISK",
  "isDTA": true,
  "drugClass": "Fluoroquinolone antibiotic",
  "primaryUse": "Bacterial infections (UTI, respiratory, skin)",
  "qtMechanism": "Blocks hERG potassium channel (IKr)",
  "cyp": {
    "metabolizedBy": ["CYP1A2", "CYP3A4"],
    "inhibits": ["CYP1A2"],
    "induces": []
  }
}
```

## Coding Conventions

### TypeScript
- Use `type` not `interface`
- **Never use `any` or `as`** — use `unknown` + type guards, or `satisfies`
- Use `import type` for type-only imports
- Use Prisma-generated types for database records
- All cross-boundary types come from `src/types/index.ts`

### Next.js Patterns
- Server Components by default — add `"use client"` only for useState, useEffect, onClick
- `params`, `searchParams`, `cookies()`, `headers()` are async in Next.js 15 — always `await` them
- API Routes (app/api/) for AI calls and data mutations
- Server Actions only for simple cache revalidation

### Architecture Rules
- Business logic lives in `src/services/` — never in API routes or components
- API routes are thin wrappers: validate input → call service → return JSON
- AI code lives in `src/ai/` — prompts, schemas, client
- All `generateObject` calls use `temperature: 0`
- All AI responses are validated by Zod schemas

### Prisma
- Use `select:` not `include:` — fetch only needed fields
- Use `@map` / `@@map` for snake_case in DB
- Add `@@index` on all foreign keys
- Use `npx prisma db push` (no migration files during hackathon)

### UI
- Mobile-first design (test at 375px width)
- Risk color system: green `#22c55e`, yellow `#eab308`, red `#ef4444`
- Every medical result screen includes disclaimer text
- Design for panic — critical information visible without scrolling
- Loading skeleton for every async operation
- Error state with retry button for every async operation

### Error Handling
- Drug not in qtdrugs.json → Claude fallback assessment, result marked `AI_ASSESSED`
- Claude API timeout/error → return local-only result + "Combo analysis unavailable" message
- Photo unreadable → "Could not read medication. Please type the name."
- Never crash the whole page — each feature fails independently

## Middleware Configuration

The middleware at `middleware.ts` handles Supabase Auth session refresh and route protection.

**Public routes (no auth required):** `/`, `/login`, `/signup`, `/emergency-card/[slug]`
**Protected routes (auth required):** everything under `/(protected)/`

The emergency card public route is critical — ER doctors must access it without a HeartGuard account.

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...          # Claude API — the only NEW env var needed
NEXT_PUBLIC_SUPABASE_URL=https://...  # Already configured
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Already configured
DATABASE_URL=postgresql://...          # Already configured
DIRECT_URL=postgresql://...            # Already configured
```

## Feature Groups and Build Priority

### Group 1: Core Scan (build FIRST — this IS the product)
- Drug lookup service (local JSON search)
- Combo analysis AI (prompts + schemas + generateObject)
- Drug scanner service (orchestrates lookup + AI)
- Text scan API route
- Scan page UI with results display

### Group 2: Patient Profile (build SECOND — personalizes the experience)
- Onboarding wizard (genotype → medications → emergency contacts)
- My Medications page (CRUD with QT risk badges)
- Onboarding + medications API routes

### Group 3: Documents (build THIRD — high demo value)
- Emergency Card generator (AI + PDF)
- Doctor Visit Prep generator (AI + PDF)
- Public shareable emergency card page

### Group 4: Enhancements (build FOURTH — polish)
- Photo scan (Claude Vision)
- Dashboard page
- Scan history page
- Settings page
- Landing page

### Group 5: Future (post-hackathon)
- Smartwatch heart rate monitoring + QT correlation
- Electrolyte risk tracking
- Family/parent mode for children with LQTS
- Multi-condition platform (Acute Porphyria, G6PD deficiency)
- Pharmacy/EHR integration

## Test Drugs for Development

Always test with these drugs to verify the system works:

| Drug | Expected Risk | Notes |
|------|--------------|-------|
| Ciprofloxacin / "Cipro" | KNOWN_RISK, DTA | Common antibiotic, very dangerous for LQTS |
| Moxifloxacin | KNOWN_RISK, DTA | The drug from our demo story |
| Clarithromycin | KNOWN_RISK, DTA, CYP3A4 inhibitor | Critical for combo testing |
| Ondansetron | KNOWN_RISK | Anti-nausea, frequently given in ER |
| Escitalopram | POSSIBLE_RISK | Common antidepressant |
| Amoxicillin | NOT_LISTED | Safe alternative — should show GREEN |
| Metoprolol | NOT_LISTED | Beta-blocker, common LQTS treatment |
| Haloperidol | KNOWN_RISK | Antipsychotic |