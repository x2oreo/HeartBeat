# QTShield — Person D: Data, Landing, History & QA

## Your Role
You have the most DIVERSE role on the team. You own three things that nobody else does:

1. **The drug database** (qtdrugs.json) — this is the FOUNDATION of the entire product. Every scan, every combo check, every "is this drug safe?" question is answered by YOUR data. If your data has 50 drugs, QTShield knows 50 drugs. If it has 200, it knows 200. Your data quality IS the product quality.

2. **The landing page and history** — the first thing judges see (landing) and a useful feature for returning users (history).

3. **Quality assurance** — you test EVERYTHING across all 4 streams and report bugs. You're the person who makes sure the demo doesn't crash.

## What Others Are Building

**Person A (Scan Engine)** builds the scanning logic. Their lookupDrug() function (that you created in Phase 0) searches YOUR qtdrugs.json. The more drugs you add with accurate data, the better their scan results. They also save ScanLog records that YOUR history page displays.

**Person B (Profile)** builds onboarding and medications. When users add medications, Person B's code calls lookupDrug() on YOUR data to get QT risk and CYP info. If a drug is missing from your JSON, it gets marked as NOT_LISTED even if it's actually dangerous.

**Person C (Documents)** builds emergency cards. Their content quality depends on the drugs the user has added — which depends on YOUR data being comprehensive.

## How Your Work Connects

```
YOUR qtdrugs.json
  ↓ (searched by)
drug-lookup.ts (you created in Phase 0)
  ↓ (used by)
Person A's scanner → uses for risk lookup
Person B's onboarding → uses for medication risk when adding
  ↓ (results saved to)
ScanLog table
  ↓ (displayed by)
YOUR history page
```

## Files You Own
```
src/data/qtdrugs.json                    # THE drug database — your primary ongoing work
src/services/drug-lookup.ts              # Created in Phase 0, you maintain if needed
app/page.tsx                             # Public landing page
app/(protected)/history/page.tsx         # Scan history timeline
app/(protected)/layout.tsx               # Shared layout for protected pages
src/components/history/*                 # History UI components
src/components/landing/*                 # Landing page components
```

## Files You Read (never edit)
```
src/types/index.ts                       # Shared types
src/lib/auth.ts                          # Auth helper
src/lib/prisma.ts                        # DB client
```

---

## Task-by-Task Guide

### Task D1: Expand Drug Database (Hour 2-12, ONGOING)

This is your HIGHEST PRIORITY for the first half. Every drug you add makes QTShield more useful and more impressive in the demo.

**Sources for drug data:**
- CredibleMeds.org — register for free, access QTdrugs list. This is THE authoritative source.
- Wikipedia "List of drugs with QT prolongation" — good starting point for drug names
- drugs.com — search each drug for CYP450 metabolism data
- DrugBank.com — academic access has detailed CYP profiles

**Hour 2-4 goal: 50 drugs**
**Hour 4-8 goal: 100 drugs**
**Hour 8-12 goal: 150 drugs**
**Hour 16+ goal: 190+ drugs (match CredibleMeds full list)**

**Claude Code prompt for bulk drug addition:**
```
Read CLAUDE.md. I'm Person D, managing the drug database.

I need to expand src/data/qtdrugs.json. Currently it has ~30 drugs. I need to add more.

Add these specific drugs with ACCURATE pharmacological data (risk category, CYP450 profiles, drug class, primary use, QT mechanism). Follow the schema exactly as described in CLAUDE.md.

Batch 1 — More antibiotics:
- Norfloxacin (KNOWN_RISK), Gatifloxacin (KNOWN_RISK), Sparfloxacin (KNOWN_RISK)
- Roxithromycin (POSSIBLE_RISK), Telithromycin (KNOWN_RISK)
- Trimethoprim-sulfamethoxazole (CONDITIONAL_RISK)
- Pentamidine (KNOWN_RISK)

Batch 2 — Antidepressants:
- Amitriptyline (KNOWN_RISK), Nortriptyline (POSSIBLE_RISK), Imipramine (KNOWN_RISK)
- Desipramine (POSSIBLE_RISK), Clomipramine (KNOWN_RISK)
- Sertraline (NOT_LISTED — safe alternative)
- Mirtazapine (POSSIBLE_RISK), Trazodone (POSSIBLE_RISK)
- Bupropion (NOT_LISTED — safe alternative)

Batch 3 — Antipsychotics:
- Ziprasidone (KNOWN_RISK), Pimozide (KNOWN_RISK)
- Chlorpromazine (KNOWN_RISK), Fluphenazine (POSSIBLE_RISK)
- Aripiprazole (NOT_LISTED — safe alternative)
- Clozapine (POSSIBLE_RISK)

Batch 4 — Cardiac drugs:
- Flecainide (KNOWN_RISK), Ibutilide (KNOWN_RISK)
- Ranolazine (CONDITIONAL_RISK), Dronedarone (KNOWN_RISK)
- Disopyramide (KNOWN_RISK)
- Digoxin (NOT_LISTED — but important to include as NOT_LISTED)

Batch 5 — Antiemetics and GI:
- Granisetron (KNOWN_RISK), Dolasetron (KNOWN_RISK)
- Prochlorperazine (POSSIBLE_RISK)
- Cisapride (KNOWN_RISK — withdrawn from market but include for reference)
- Metoclopramide (NOT_LISTED)

Batch 6 — Common safe drugs (important for alternatives):
- Cetirizine (NOT_LISTED), Loratadine (NOT_LISTED)
- Ranitidine (NOT_LISTED), Famotidine (NOT_LISTED)
- Acetaminophen/Paracetamol (NOT_LISTED), Naproxen (NOT_LISTED)
- Doxycycline (NOT_LISTED), Cephalexin (NOT_LISTED)
- Penicillin V (NOT_LISTED), Clindamycin (NOT_LISTED)

For EACH drug, include all fields: genericName, searchTerms (with brand names), riskCategory, isDTA, drugClass, primaryUse, qtMechanism, and cyp { metabolizedBy, inhibits, induces }.

Use REAL pharmacological data. The CYP profiles must be accurate — Person A's combo analyzer depends on this.
```

**Run this in batches.** After each batch, verify the JSON is valid. The searchTerms array is critical — include brand names, common misspellings, abbreviations.

### Task D2: Protected Layout (Hour 4-6)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person D, building shared UI.

Create app/(protected)/layout.tsx — the shared layout for all authenticated pages.

It should:
1. Check if user is authenticated (server component, use auth helper)
2. If not authenticated, redirect to /login
3. If authenticated but not onboarded, redirect to /onboarding (check user.onboarded from Prisma)
4. Show a mobile-friendly navigation: bottom tab bar on mobile, sidebar on desktop
5. Nav items: Dashboard (home icon), Scan (search icon), Medications (pill icon), Emergency Card (heart icon), History (clock icon)
6. Show QTShield logo/name at top
7. User avatar/name in corner with settings link

Keep it clean and medical-feeling. The nav should not distract from the main content.
```

### Task D3: Landing Page (Hour 8-14)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person D, building the landing page.

Create app/page.tsx — the public landing page. This is the FIRST thing hackathon judges see.

Structure:
1. Hero section:
   - Headline: "Your Heart Medication Guardian" (or similar powerful headline)
   - Subheadline: "Instantly check if any medication is safe for Long QT Syndrome patients"
   - CTA button: "Get Started" → links to /signup
   - Maybe a visual: heart icon + shield icon

2. Problem section:
   - "190+ common medications can cause sudden cardiac death in LQTS patients"
   - "14 drugs have been pulled from the market for causing fatal heart arrhythmias"
   - "1 in 3,000 people have congenital Long QT Syndrome — many don't know"

3. How it works — 3 steps:
   - Step 1: "Scan" — Type or photograph any medication
   - Step 2: "Check" — AI cross-references 190+ dangerous drugs and analyzes combinations
   - Step 3: "Safe" — Get instant risk assessment with safe alternatives

4. Features section:
   - Medication scanning with combo detection
   - Emergency Card for ER doctors
   - Doctor Visit Prep documents
   - Works offline (PWA)

5. Footer CTA: "Start Protecting Your Heart" → /signup

Make it visually impressive. Use the red color theme for medical urgency. Mobile-first. Fast loading (no heavy images — use icons/SVG).
```

### Task D4: History Page (Hour 14-18)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person D, building the scan history page.

Create app/(protected)/history/page.tsx — shows all past scans in chronological order.

This is a server component that loads from Prisma:
- ScanLog records for the current user, ordered by createdAt desc
- Each has: drugName, genericName, riskCategory, comboRisk, scanType, createdAt, fullResult (JSON)

Display as a timeline/list:
- Each entry is a card showing:
  - Drug name (generic + brand if available)
  - Colored risk badge (green/yellow/red based on riskCategory)
  - Scan type icon: keyboard icon for TEXT, camera icon for PHOTO
  - Date/time (relative: "2 hours ago", "Yesterday")
  - If comboRisk exists: small combo risk badge
- Tap/click to expand and see full details from fullResult JSON
  - This should render the same result view as the scan page
- Empty state: "No scans yet. Scan your first medication!" with link to /scan

Pagination or infinite scroll if many scans. Start with showing last 50.
```

### Task D5: End-to-End Testing (Hour 18-28, ONGOING)

This is where you switch from builder to QA. Test EVERY flow across ALL streams.

**Test checklist:**

```
AUTH FLOW:
□ Sign up with email → lands on onboarding
□ Complete onboarding → lands on dashboard
□ Sign out → redirected to login
□ Visit /dashboard without auth → redirected to login
□ Visit /emergency-card/[slug] without auth → WORKS (public page)

ONBOARDING (Person B):
□ Select genotype LQT2 → saved correctly
□ Add 3 medications → all saved with correct QT risk
□ Add medication not in database → saved as NOT_LISTED
□ Add emergency contact → saved
□ Complete → redirected to dashboard

SCAN (Person A):
□ Type "Cipro" → autocomplete shows Ciprofloxacin → RED result, KNOWN_RISK, DTA
□ Type "Amoxicillin" → GREEN result, NOT_LISTED, instant (no AI call)
□ Type "Escitalopram" → YELLOW result, POSSIBLE_RISK
□ With Escitalopram in medications, scan "Clarithromycin" → RED + CRITICAL combo (CYP3A4 interaction)
□ Type "asdfgh" → Not found → AI assessment → "not a real medication"
□ Type partial "mox" → autocomplete shows Moxifloxacin
□ Photo scan of a medication box → drug detected → result shown
□ Photo of blurry/unreadable image → error message, suggests typing

MEDICATIONS (Person B):
□ Add medication → appears in list with QT badge
□ Remove medication → disappears (soft delete)
□ View medications → all show correct risk colors

DOCUMENTS (Person C):
□ Generate Emergency Card → renders with all sections
□ Download PDF → valid PDF file
□ Share Link → public URL works
□ QR code → scannable, leads to public card
□ Public card page → loads without auth
□ Generate Doctor Prep (dental) → renders with procedure-specific drugs
□ Download Doctor Prep PDF → valid PDF

HISTORY (yours):
□ After multiple scans → history shows all in order
□ Each entry has correct risk color
□ Tap to expand → full result displayed

MOBILE:
□ All pages usable at 375px width
□ Touch targets are large enough
□ No horizontal scroll
□ Bottom nav works
```

**When you find a bug:** Message the person who owns that feature. Be specific: "Person A: scanning 'Cipro' returns 500 error. Console shows: [error message]."

### Task D6: Demo Preparation (Hour 28-40)

**Demo script (5 minutes):**

Minute 0:00-1:00 — THE PROBLEM
"190 common medications can stop your heart. If you have Long QT Syndrome — a condition affecting 1 in 3,000 people — taking the wrong antibiotic, antidepressant, or even anti-nausea pill can trigger a fatal cardiac arrhythmia. 14 drugs have already been pulled from the market for this. And most patients don't know which drugs are dangerous until it's too late."

Minute 1:00-2:00 — MARIA'S STORY
"Meet Maria. She's 19, a student, an athlete. She has congenital LQTS type 2. Last year she got the flu. Her doctor prescribed Moxifloxacin — a standard antibiotic given to millions. Three hours later, her heart stopped. She survived. 30% of patients in her situation don't."

Minute 2:00-4:00 — LIVE DEMO
Show the app on your phone (or phone emulator):
1. Quick onboarding: select LQT2, add Escitalopram as current med (30 sec)
2. Scan "Moxifloxacin" → RED screen, KNOWN_RISK, DTA, alternatives shown (20 sec)
3. Scan "Amoxicillin" → GREEN screen, instant (10 sec)
4. Scan "Clarithromycin" → RED + CRITICAL combo with Escitalopram, CYP3A4 interaction explained (20 sec)
5. Show Emergency Card → beautiful medical card (15 sec)
6. Share it → scan QR code with another phone → public card appears (15 sec)
7. Show Doctor Prep for dental → procedure-specific drug list (10 sec)

Minute 4:00-5:00 — VISION
"QTShield today checks 190+ medications against the CredibleMeds database — the gold standard used by the FDA. Next: Apple Watch integration for real-time heart monitoring after taking medication. And the same architecture works for other conditions — Acute Porphyria has 1,000+ dangerous drugs, G6PD deficiency affects 400 million people worldwide. One platform. Thousands of lives."

**Prepare backup plan:** If live demo fails, have screenshots/recording ready.

---

## When You Need Others

| What you need | From whom | When |
|---|---|---|
| Scan flow working (to test) | Person A | After hour 16 |
| Onboarding working (to test) | Person B | After hour 12 |
| Emergency card working (to test) | Person C | After hour 18 |

## Your Superpower

You're the only person who sees THE WHOLE PRODUCT. Everyone else is heads-down in their stream. You test across all streams and catch integration issues early. This role is MORE VALUABLE than it sounds — the person who finds and fixes integration bugs before the demo saves the entire team.
