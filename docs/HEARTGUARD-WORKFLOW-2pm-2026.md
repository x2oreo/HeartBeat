# HeartGuard — Team Workflow (4 Fullstack Developers)

> Each person owns a COMPLETE feature stream: UI + API + services + AI.
> After Phase 0, all 4 work in parallel with ZERO blocking.

---

## Phase 0: Shared Foundation (2 Hours — All Together)

Before anyone starts their feature stream, the team builds the foundation TOGETHER. Split the work so all 4 contribute simultaneously:

### Person A does:
- Install all packages: `npm install ai @ai-sdk/anthropic zod jspdf qrcode @types/qrcode`
- Create `src/ai/client.ts` — Anthropic provider singleton
- Create `src/lib/prisma.ts` — Prisma client singleton

### Person B does:
- Write `prisma/schema.prisma` with all 4 models (User, Medication, ScanLog, EmergencyContact)
- Run `npx prisma db push` + `npx prisma generate`
- Verify tables exist in Supabase dashboard

### Person C does:
- Create `src/types/index.ts` with ALL shared types
- Create `src/lib/auth.ts` — helper to get current user from Supabase session
- Fix `middleware.ts` — make `/`, `/login`, `/signup`, `/emergency-card/[slug]` public

### Person D does:
- Create `src/data/qtdrugs.json` with minimum 30 drugs (the test drugs from CLAUDE.md + extras)
- Create `src/services/drug-lookup.ts` — the pure JSON search function (lookupDrug + searchDrugs)
- Create the directory structure: `src/services/`, `src/ai/`, `src/components/`, `src/hooks/`

### Together at the end:
- Everyone pulls all changes
- Verify: auth works (signup → login → protected page → logout)
- Verify: `lookupDrug("cipro")` returns ciprofloxacin data
- Verify: types compile, Prisma client generates

**After Phase 0: everyone starts their stream independently.**

---

## File Ownership Map (Who Owns What)

This is critical. NO TWO PEOPLE EDIT THE SAME FILE. Each file has ONE owner.

### Person A — Scan Engine
```
OWNS (creates and maintains):
  src/services/drug-scanner.ts          # Core scan logic
  src/services/photo-scanner.ts         # Photo scan logic  
  src/ai/scan-prompts.ts               # Combo analysis + unknown drug prompts
  src/ai/scan-schemas.ts               # ComboAnalysis, DetectedDrugs, UnknownDrug schemas
  app/api/scan/text/route.ts           # Text scan endpoint
  app/api/scan/photo/route.ts          # Photo scan endpoint
  app/(protected)/scan/page.tsx        # Scan page (input + camera + results)
  src/components/scan/*                # All scan UI components
  src/hooks/use-drug-scan.ts           # Scan state management hook

READS (imports but never edits):
  src/services/drug-lookup.ts          # Created by Person D in Phase 0
  src/ai/client.ts                     # Created in Phase 0
  src/types/index.ts                   # Created in Phase 0
  src/lib/auth.ts                      # Created in Phase 0
```

### Person B — Profile & Medications
```
OWNS:
  app/api/onboarding/route.ts          # Save genotype + meds + contacts
  app/api/medications/route.ts         # CRUD medications
  app/(protected)/onboarding/page.tsx  # 3-step wizard
  app/(protected)/medications/page.tsx # My Medications list
  app/(protected)/dashboard/page.tsx   # Home dashboard
  app/(protected)/settings/page.tsx    # Profile settings
  src/components/onboarding/*          # Onboarding UI
  src/components/medications/*         # Medications UI
  src/components/dashboard/*           # Dashboard widgets
  src/hooks/use-medications.ts         # Medication state hook

READS:
  src/services/drug-lookup.ts
  src/types/index.ts
  src/lib/auth.ts
```

### Person C — Documents & Emergency
```
OWNS:
  src/services/document-generator.ts   # AI document generation logic
  src/ai/document-prompts.ts           # Emergency card + doctor prep prompts
  src/ai/document-schemas.ts           # EmergencyCard, DoctorPrep schemas
  app/api/documents/emergency-card/route.ts
  app/api/documents/doctor-prep/route.ts
  app/(protected)/emergency-card/page.tsx    # Generate + view card
  app/(protected)/doctor-prep/page.tsx       # Generate doctor brief
  app/emergency-card/[slug]/page.tsx         # PUBLIC shareable card (no auth)
  src/components/documents/*                 # Document UI components
  src/hooks/use-documents.ts                 # Document state hook

READS:
  src/ai/client.ts
  src/types/index.ts
  src/lib/auth.ts
```

### Person D — Data + Landing + History + QA
```
OWNS:
  src/data/qtdrugs.json                # Drug database (ONGOING — keeps expanding)
  app/page.tsx                         # Public landing page
  app/(protected)/history/page.tsx     # Scan history timeline
  src/components/history/*             # History UI
  src/components/landing/*             # Landing page components
  app/(protected)/layout.tsx           # Shared layout for protected pages

READS:
  src/types/index.ts

ALSO DOES:
  End-to-end testing across ALL features
  Bug reporting and fixing (can edit any file for bug fixes with team approval)
  Demo script and pitch preparation
```

### Truly Shared Files (edit only by team agreement):
```
  src/types/index.ts                   # Change = all 4 must pull
  prisma/schema.prisma                 # Frozen after Phase 0
  middleware.ts                        # Frozen after Phase 0
  src/services/drug-lookup.ts          # Frozen after Phase 0
  src/ai/client.ts                     # Frozen after Phase 0
```

---

## Why AI Files Are Split

The `src/ai/` directory has SEPARATE files per feature stream to prevent conflicts:

```
src/ai/
  client.ts                  # Shared — Phase 0, frozen
  scan-prompts.ts            # Person A owns — combo analysis + unknown drug prompts  
  scan-schemas.ts            # Person A owns — ComboAnalysis, DetectedDrugs, UnknownDrug
  document-prompts.ts        # Person C owns — emergency card + doctor prep prompts
  document-schemas.ts        # Person C owns — EmergencyCard, DoctorPrep schemas
```

Person A and Person C NEVER edit each other's AI files. Zero conflicts.

---

## Parallel Timeline (What Each Person Does Each Hour)

### Hours 0-2: Phase 0 (Together)
All 4 work on foundation as described above.

### Hours 2-16: First Features (Everyone in parallel)

**Person A (Scan Engine):**
- Hour 2-6: Create scan-schemas.ts + scan-prompts.ts. The combo analysis prompt is the HARDEST part — needs extensive context engineering. Test with Claude API directly.
- Hour 6-10: Create drug-scanner.ts — the scanDrugByText function. Wire up: lookup → combo AI → alternatives → save log. Test with raw function calls.
- Hour 10-14: Create /api/scan/text route + scan page UI. End-to-end: type "Cipro" → see red result.
- Hour 14-16: Polish scan results UI. Color-coded cards, alternatives display, "Show to Doctor" view.

**Person B (Profile):**
- Hour 2-6: Create /api/onboarding route. Full logic: create/update user, save genotype, create medications with QT risk data from lookupDrug, create emergency contacts. All in Prisma transaction.
- Hour 6-12: Create onboarding page — 3-step wizard UI. Genotype selection → medication input with autocomplete + risk badges → emergency contacts form. Submit → redirect to dashboard.
- Hour 12-16: Create /api/medications (CRUD) + medications page. List with QT badges, add/remove buttons.

**Person C (Documents):**
- Hour 2-6: Create document-schemas.ts + document-prompts.ts. The emergency card prompt needs to generate structured content that looks professional for ER doctors. Test with Claude API.
- Hour 6-10: Create document-generator.ts — generateEmergencyCard and generateDoctorPrep functions. Test raw outputs.
- Hour 10-14: Create /api/documents/ routes + emergency card page. Generate → view → download PDF.
- Hour 14-16: Create public shareable emergency card page (/emergency-card/[slug]). QR code generation. Share link system.

**Person D (Data + Landing):**
- Hour 2-8: EXPAND qtdrugs.json aggressively. Goal: 100+ drugs with full CYP data. This is the MOST IMPACTFUL work — every drug added makes the product better.
- Hour 8-12: Create landing page. Hero, problem statement, how it works, CTA.
- Hour 12-16: Create history page + layout for protected pages. Start testing Person A's scan flow.

### CHECKPOINT at Hour 16
Everyone pushes to main. Quick sync: "Does scan work? Does onboarding work? Do documents generate?"
From this point, everything should be functional at basic level.

### Hours 16-28: Mature Features (Everyone in parallel)

**Person A:**
- Hour 16-22: Photo scanner — photo-scanner.ts + /api/scan/photo route + camera UI on scan page.
- Hour 22-28: Prompt optimization. Test 20+ drugs, find edge cases, improve combo analysis accuracy. This is where the product quality goes from "works" to "impressive".

**Person B:**
- Hour 16-20: Dashboard page — genotype badge, medication count, risk indicator, big scan button, last 5 scans.
- Hour 20-24: Settings page — edit genotype, name, emergency contacts.
- Hour 24-28: Polish onboarding + medications UX. Loading states, error handling, empty states.

**Person C:**
- Hour 16-22: Doctor prep page — procedure type dropdown → generate brief → view → PDF download.
- Hour 22-28: Emergency card polish — make the card BEAUTIFUL. This is the most visually impressive feature for the demo. Also multi-language support if time allows (Claude translates content).

**Person D:**
- Hour 16-22: Reach 150+ drugs in qtdrugs.json. Add CYP interaction data for all KNOWN_RISK drugs.
- Hour 22-28: Full end-to-end testing. Run ALL test scenarios. Report bugs to the right person.

### CHECKPOINT at Hour 28
All features should be COMPLETE. From now on: only polish, testing, and demo prep.

### Hours 28-40: Polish & Integration (Everyone)

**Everyone does:**
- Fix any remaining bugs from testing
- Mobile responsiveness check (375px width)
- Loading states and error handling everywhere
- Medical disclaimers on all result screens

**Person A:** Final prompt tuning, edge case handling, photo scan reliability
**Person B:** Dashboard polish, smooth navigation between pages
**Person C:** Emergency card visual design, PDF quality, share flow UX
**Person D:** 190+ drugs final push, comprehensive testing, start demo script

### Hours 40-50: Demo Preparation

**Person D leads**, everyone helps:
- Demo script: minute-by-minute plan for 5-minute presentation
- Test the EXACT demo flow on the Vercel deployment
- Prepare backup plan if something fails during demo
- Pitch deck: 5 slides (Problem → Maria's Story → Live Demo → Tech → Vision)

### Hours 50-60: Rehearsal

- Run full demo 3 times
- Fix any last-second issues
- STOP CODING at hour 56. Only critical bug fixes after that.

---

## Git Strategy for Zero Conflicts

### Branch naming:
```
feat/scan-engine        # Person A
feat/profile            # Person B  
feat/documents          # Person C
feat/data-and-landing   # Person D
```

### Merge rules:
- Each person merges to `main` when their feature works (not when it's perfect)
- Before merging: `git pull origin main` → resolve any conflicts → push
- After merging: announce on team chat "Merged scan-engine to main. Pull."
- Others pull main into their branch regularly

### If two people need each other's code:
Most common case: Person A's scan results need to show in Person D's history page.
Solution: Person A merges to main first. Person D pulls. No direct dependency.

### The golden rule:
Each person's files are in DIFFERENT directories. If you follow the ownership map above, you will NEVER have a merge conflict on the same file.

---

## Claude Code Prompts for Each Stream

### How to give Claude Code good context:

Always start a Claude Code session with:
1. It reads CLAUDE.md automatically (it's in the repo root)
2. Tell it WHICH stream you're working on
3. Tell it WHAT feature you're building right now
4. Tell it what already exists that it should integrate with

### Person A: Starting the scan engine
```
I'm building the Scan Engine stream of HeartGuard. Read CLAUDE.md for project context.

My first task: create the AI schemas and prompts for drug combo analysis.

Create src/ai/scan-schemas.ts with Zod schemas:
1. ComboAnalysisSchema — the response when we analyze a new drug against the patient's current medications. It should include combo risk assessment (level, explanation, specific interactions found) AND safe alternative suggestions.
2. DetectedDrugsSchema — the response when Claude Vision reads a medication photo.
3. UnknownDrugSchema — the response when a drug isn't in our database and we ask Claude to assess it.

Then create src/ai/scan-prompts.ts with prompt builder functions.
The combo prompt is the most important — it must inject the patient's genotype, all current medications with their QT risk and CYP450 data from our database, and the new drug being checked. The system context should establish Claude as a cardiac pharmacology expert for LQTS. Temperature 0 for medical safety.

Import types from src/types/index.ts. Import the Anthropic provider from src/ai/client.ts.
```

### Person B: Starting profile
```
I'm building the Profile & Medications stream of HeartGuard. Read CLAUDE.md for project context.

My first task: create the onboarding API and page.

Create app/api/onboarding/route.ts — POST handler that accepts:
{ genotype: string, medications: string[], emergencyContacts: [{name, phone, relationship}] }

It should: validate with Zod, get the authenticated user, find-or-create the User record by supabaseId, set genotype and onboarded=true, for each medication name call lookupDrug() to get QT risk data and create a Medication record, create EmergencyContact records. All in a Prisma transaction.

Then create app/(protected)/onboarding/page.tsx — a 3-step client component wizard:
Step 1: genotype selection (radio buttons for LQT1/LQT2/LQT3/Other/Unknown)
Step 2: add current medications (text input with autocomplete using searchDrugs, show risk badge for each added drug)
Step 3: emergency contacts (name + phone + relationship dropdown)
Submit calls the onboarding API, then redirects to /dashboard.

Drug lookup functions are in src/services/drug-lookup.ts. Types in src/types/index.ts.
```

### Person C: Starting documents
```
I'm building the Documents & Emergency stream of HeartGuard. Read CLAUDE.md for project context.

My first task: create the emergency card AI and page.

Create src/ai/document-schemas.ts with Zod schemas for EmergencyCard (headline, criticalWarning, drugsToAvoid categories, safeAlternatives, currentMedications, emergencyProtocol steps, emergencyContacts) and DoctorPrep responses.

Create src/ai/document-prompts.ts with prompt builders. The emergency card prompt takes the full patient profile (name, genotype, medications with risk, contacts) and generates structured card content that an ER doctor can read in 30 seconds.

Create src/services/document-generator.ts with generateEmergencyCard(userId) that loads the profile from Prisma and makes one generateObject call.

Create app/api/documents/emergency-card/route.ts and app/(protected)/emergency-card/page.tsx.

The page should show a beautiful visual card with red medical styling, and buttons for Download PDF, Share Link, and QR Code.

Also create app/emergency-card/[slug]/page.tsx as a PUBLIC page (no auth) for the shareable card.
```

### Person D: Starting data + landing
```
I'm building the Data & Landing stream of HeartGuard. Read CLAUDE.md for project context.

My first task: expand the drug database and create the landing page.

For the drug database: I need to add more entries to src/data/qtdrugs.json. Each entry needs genericName, searchTerms (brand names + common misspellings), riskCategory, isDTA, drugClass, primaryUse, qtMechanism, and cyp data (metabolizedBy, inhibits, induces arrays).

Right now I need to add these drug categories:
- More fluoroquinolone antibiotics
- Macrolide antibiotics (azithromycin, clarithromycin, erythromycin)
- Antipsychotics (haloperidol, chlorpromazine, thioridazine, quetiapine, ziprasidone)
- Antidepressants (citalopram, escitalopram, fluoxetine, sertraline, tricyclics)
- Antiemetics (ondansetron, domperidone, droperidol)
- Antiarrhythmics (amiodarone, sotalol, dofetilide, quinidine, procainamide)
- Common safe drugs (amoxicillin, paracetamol, ibuprofen, metoprolol, nadolol)

Use real pharmacological data. Check CredibleMeds.org for risk categories and medical references for CYP profiles.

Then create app/page.tsx — the public landing page. Hero section with "Your Heart Medication Guardian", problem statement about LQTS and dangerous drugs, how it works in 3 steps, and a sign up button.
```

---

## Communication Checkpoints

| Hour | What | How |
|------|------|-----|
| 0 | "Starting Phase 0" | In person |
| 2 | "Foundation done. Everyone pull main." | Team chat |
| 8 | Quick status: "I'm at X, any blockers?" | Team chat |
| 16 | SYNC: Everyone merges. "What works? What doesn't?" | In person, 10 min |
| 24 | Quick status check | Team chat |
| 28 | SYNC: "All features complete?" | In person, 10 min |
| 40 | "Feature freeze. Bug fixes and demo prep only." | In person |
| 50 | "Code freeze. Demo rehearsal begins." | In person |

---

## The One Rule That Prevents Chaos

**If you need to change a SHARED file (types, schema, drug-lookup, client), announce it in team chat BEFORE you change it. Everyone must pull after.**

Everything else — your files, your rules. Build fast, merge often, communicate at checkpoints.
