# QTShield — Person B: Profile & Medications

## Your Role
You own everything about the user's identity in QTShield — how they set up their profile, manage their medications, and see their personal dashboard. Without your work, no one can onboard, and Person A's combo analysis has no medication data to analyze against. You are the data foundation.

## What Others Are Building

**Person A (Scan Engine)** builds the drug scanning. Their combo analyzer READS the medications YOU create in the database. When a user scans a drug, Person A's code loads the user's active medications (that YOUR onboarding/medications feature created) and sends them to Claude for combo analysis. You don't need to know how the AI works — just make sure Medication records have the right data (especially cypData JSON from drug-lookup).

**Person C (Documents)** builds Emergency Card and Doctor Prep. Their document generator READS the same user profile + medications that you manage. They query the same Prisma models you create records for.

**Person D (Data)** curates qtdrugs.json. You USE their drug-lookup.ts function when users add medications in onboarding — you call lookupDrug() to get the QT risk and CYP data for each medication.

## How Your Work Connects

```
User signs up (Supabase Auth — already works)
       ↓
YOUR onboarding page: collects genotype + medications + contacts
       ↓
YOUR onboarding API: 
  - Creates User record with genotype
  - For each medication: calls lookupDrug() (Person D's code) → gets risk + CYP data
  - Creates Medication records with qtRisk + cypData
  - Creates EmergencyContact records
       ↓
Data is now in DB, available for:
  - Person A's combo analyzer (reads medications for combo check)
  - Person C's document generator (reads profile for emergency card)
  - YOUR dashboard (shows overview)
```

## Files You Own
```
app/api/onboarding/route.ts            # POST: save genotype + meds + contacts
app/api/medications/route.ts           # GET/POST/DELETE: medication CRUD
app/(protected)/onboarding/page.tsx    # 3-step wizard UI
app/(protected)/medications/page.tsx   # My Medications list
app/(protected)/dashboard/page.tsx     # Home dashboard
app/(protected)/settings/page.tsx      # Edit profile
src/components/onboarding/*            # Onboarding UI components
src/components/medications/*           # Medication list components
src/components/dashboard/*             # Dashboard widgets
src/hooks/use-medications.ts           # Medication state hook
```

## Files You Read (never edit)
```
src/services/drug-lookup.ts            # Call lookupDrug() when adding medications
src/types/index.ts                     # Shared types
src/lib/auth.ts                        # Auth helper
src/lib/prisma.ts                      # DB client
```

---

## Task-by-Task Guide

### Task B1: Onboarding API (Hour 2-6)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person B, building Profile & Medications.

Create app/api/onboarding/route.ts — POST handler for user onboarding.

Accepts JSON body:
{
  genotype: string (one of LQT1, LQT2, LQT3, OTHER, UNKNOWN),
  medications: string[] (array of drug names),
  emergencyContacts: [{ name: string, phone: string, relationship: string }]
}

Logic:
1. Get authenticated user via auth helper — 401 if not authenticated
2. Validate input with Zod
3. In a Prisma transaction:
   a. Upsert User record by supabaseId — set email, genotype, onboarded=true
   b. For each medication name in the array:
      - Call lookupDrug(name) from src/services/drug-lookup.ts
      - If found: create Medication record with genericName, brandName (first searchTerm that isn't genericName), qtRisk from lookup, isDTA from lookup, cypData as JSON from lookup
      - If not found: create Medication record with genericName=input, qtRisk='NOT_LISTED', isDTA=false
   c. For each emergency contact: create EmergencyContact record
4. Return { success: true, userId }

Handle errors: 400 for validation, 500 for DB errors with descriptive message.
```

### Task B2: Onboarding Page (Hour 6-12)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person B, building Profile & Medications.

Create app/(protected)/onboarding/page.tsx — a 3-step wizard. This is a client component.

Step 1 — Genotype Selection:
- Title: "What is your LQTS type?"
- 5 radio button cards: LQT1, LQT2, LQT3, Other, I don't know
- Brief description under each:
  - LQT1: "Triggered by exercise and swimming"
  - LQT2: "Triggered by sudden noises and emotional stress"
  - LQT3: "Events occur during sleep or rest"
  - Other: "A rarer subtype or uncertain"
  - I don't know: "We'll use general LQTS safety guidelines"
- "Next" button at bottom

Step 2 — Current Medications:
- Title: "What medications do you currently take?"
- Text input with autocomplete dropdown (use searchDrugs from drug-lookup.ts — you may need a small API route for this, or import the data client-side)
- When user selects a drug, it appears in a list below with a colored QT risk badge
- Each item has a remove (X) button
- Can add multiple medications
- "Next" button + "Skip" link if they don't take any

Step 3 — Emergency Contacts:
- Title: "Add your cardiologist and a family member"
- Two contact forms: name + phone + relationship dropdown (Cardiologist, Family, Friend)
- At least 1 contact required
- "Complete Setup" button

On submit: POST to /api/onboarding with all collected data.
On success: redirect to /dashboard.
Show loading state during submission. Show error toast if it fails.

Design: clean, calming, medical feel. Step indicator at top (1 — 2 — 3). Mobile-first.
```

### Task B3: Medications API (Hour 12-16)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person B, building Profile & Medications.

Create app/api/medications/route.ts with three handlers:

GET — return current user's active medications:
- Auth check
- Query: user's medications where active=true, select: id, genericName, brandName, dosage, qtRisk, isDTA, addedAt
- Return as JSON array

POST — add a new medication:
- Auth check
- Validate: { drugName: z.string().min(2) }
- Call lookupDrug(drugName) to get QT risk data
- Create Medication record with risk data and cypData from lookup
- Return the created medication

DELETE — remove a medication:
- Auth check
- Validate: { medicationId: z.string().uuid() }
- Soft delete: update medication set active=false
- Verify the medication belongs to the authenticated user before deleting
- Return { success: true }
```

### Task B4: Medications Page (Hour 16-20)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person B, building Profile & Medications.

Create src/hooks/use-medications.ts — hook that manages medication state:
- medications: array from GET /api/medications
- loading, error states
- addMedication(drugName): POST /api/medications → refresh list
- removeMedication(id): DELETE /api/medications → refresh list
- fetchMedications(): initial load

Then create app/(protected)/medications/page.tsx:

- Title: "My Medications"
- If user has QT-prolonging medications (qtRisk !== NOT_LISTED), show a warning banner at top with count: "You have X QT-prolonging medications. QTShield checks every new drug against these."
- List of medications, each showing:
  - Generic name (large) + brand name (smaller, gray)
  - Colored QT risk badge: green dot for NOT_LISTED, yellow for POSSIBLE/CONDITIONAL, red for KNOWN_RISK
  - Dosage if set
  - Remove button (with confirmation)
- "Add Medication" button → shows input with autocomplete → adds and refreshes
- Empty state if no medications: "No medications added yet. Add your current medications so QTShield can check drug combinations."

Mobile-first. Each medication is a card with clear visual hierarchy.
```

### Task B5: Dashboard (Hour 20-24)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person B, building Profile & Medications.

Create app/(protected)/dashboard/page.tsx — the home screen after login.

This is a server component that loads data from Prisma:
- User profile (name, genotype)
- Active medication count + how many are QT-prolonging
- Last 5 scan logs (from ScanLog table, ordered by createdAt desc)

Display:
1. Welcome header with user name + genotype badge (e.g., "LQT2" in a colored pill)
2. Medication summary card: "X medications, Y are QT-prolonging" with colored indicator
3. BIG "Scan Medication" button — links to /scan (Person A's page)
4. Recent scans section: last 5 scans showing drug name + risk color + date
   - Each links to the full result (if we store fullResult in ScanLog, we can render it)
5. Quick links: My Medications, Emergency Card, Scan History

If user is not onboarded (onboarded=false), redirect to /onboarding.

Mobile-first. The SCAN button should be the most prominent element.
```

### Task B6: Settings Page (Hour 24-28)

**Claude Code prompt:**
```
Read CLAUDE.md. I'm Person B, building Profile & Medications.

Create app/(protected)/settings/page.tsx — profile settings:

Sections:
1. Genotype — current selection + ability to change (dropdown). Save via API call.
2. Emergency Contacts — list current contacts, edit/delete, add new. Each has name + phone + relationship.
3. Account — email (read-only from Supabase), sign out button.

Create any needed API routes for updating these fields.
Keep it simple — this is not the main feature, just necessary for completeness.
```

---

## When You Need Others

| What you need | From whom | When |
|---|---|---|
| lookupDrug() function working | Person D | Available from Phase 0 |
| Scan page to link to from dashboard | Person A | After hour 16 |
| Emergency card page to link to from dashboard | Person C | After hour 16 |

## Critical Data Point

When you create Medication records in onboarding/medications API, ALWAYS store the `cypData` JSON from lookupDrug(). This is the CYP450 metabolism data that Person A's combo analyzer needs. Without it, combo analysis won't know about drug interactions.

Example: when user adds "Clarithromycin", lookupDrug returns cypData: `{ metabolizedBy: ["CYP3A4"], inhibits: ["CYP3A4"], induces: [] }`. Store this in the Medication.cypData field. Person A's code reads this when analyzing combos.
