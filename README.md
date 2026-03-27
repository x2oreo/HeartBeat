# QTShield

### AI-powered medication safety for Long QT Syndrome patients

**Live at [qtshield.me](https://qtshield.me)**

![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude-Sonnet_4.6-D97706?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-7.5-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel)

---

## Overview

QTShield helps patients with **Long QT Syndrome (LQTS)** - a genetic heart condition where certain medications can cause sudden cardiac death - safely navigate a medical system that was not designed for them.

LQTS patients carry an invisible risk: over **190 common medications** (antibiotics, antidepressants, antihistamines, anti-nausea drugs) can prolong the heart's QT interval and trigger a fatal arrhythmia. The danger compounds with every drug combination. Doctors often don't check, pharmacies check individual drugs but miss interactions, and patients in foreign ERs have no way to communicate their condition.

QTShield is a **mobile-first PWA** that integrates:
- Instant medication scanning with a 190+ drug risk database
- AI-powered combination analysis via Claude (CYP450, genotype-specific risk)
- Real-time Apple Watch health monitoring with automatic SOS alerts
- Emergency Card generation in 13 languages - shareable via QR code for any ER worldwide
- An AI chat assistant that knows the patient's full profile and can run safety checks on demand

---

## The Problem

**Long QT Syndrome** affects **1 in 3,000–5,000 people**. The heart takes longer than normal to recharge between beats - harmless at rest, fatal when triggered by the wrong drug. It is largely invisible: patients look and feel healthy until the moment they don't.

The three genetic subtypes (LQT1, LQT2, LQT3) each have different triggers. LQT1 is most dangerous during physical exertion. LQT2 is triggered by sudden sounds. LQT3 events happen at rest. A medication that's fine for one subtype can be deadly for another.

**What goes wrong today:**
- A doctor prescribes a routine antibiotic (ciprofloxacin) without knowing it's contraindicated
- A pharmacist clears each drug individually, missing the compounding interaction between two "low risk" drugs that share the same metabolic enzyme (CYP3A4)
- A patient arrives in an ER abroad and can't communicate their medication list
- A nurse gives ondansetron - standard anti-nausea protocol - not knowing it can kill this specific patient

There is no consumer tool that combines real-time drug scanning, genotype-aware combination analysis, and emergency response. QTShield is that tool.

---

## How It Works

### Layer 1 - Apple Watch

The watch is the patient's continuous guardian. It streams live health data to QTShield over a secure API token:

- **Ingests:** heart rate, HRV, RR interval, stress level, irregular rhythm detection, resting HR, steps, active energy, sleep state
- **Triggers alerts** when thresholds are crossed (high HR, stress spike, rhythm irregularity)
- **Pairs** via 6-digit PIN code (5-minute expiry) - no account needed on the watch itself
- **Receives push notifications** (APNS) back from QTShield when a scan finds a dangerous drug

Watch data flows into the app via SSE (Server-Sent Events) for real-time display on the dashboard. If the patient triggers SOS, the watch is the input; QTShield handles the response.

### Layer 2 - Web App

The core patient interface, built as a mobile-first PWA. Eight main screens:

| Screen | What it does |
|---|---|
| Dashboard | Risk overview, recent scans, CYP conflict summary, live watch feed |
| Scan | Type a drug name or photograph a medication box → instant RED/YELLOW/GREEN result |
| Medications | Manage current medication list; each med shows QT risk badge and CYP profile |
| Chat | Ask the AI assistant anything; it can run scans, look up drugs, and generate documents |
| Emergency Card | AI-generated multilingual card with QR code; public link requires no login |
| Doctor Prep | Specialty-specific (cardiologist, surgeon, dentist, anesthesiologist…) AI safety brief |
| History | Timeline of all past scans |
| Settings | Profile, genotype, emergency contacts, country (for local emergency numbers) |

### Layer 3 - AI (Claude Sonnet 4.6)

Claude is called precisely and sparingly - medical accuracy demands it:

| Situation | Claude calls | Why |
|---|---|---|
| Safe drug scan | **0** | Local JSON lookup only, instant |
| Risky drug, no other meds | **0** | Local data gives the risk category |
| Risky drug + other medications | **1** | Combo analysis + alternatives |
| Photo scan | **1** (Vision) + above | Vision reads the drug name from the image |
| Emergency Card generation | **1** | Structured multilingual card content |
| Doctor Prep generation | **1** | Specialty-aware drug safety brief |
| Chat with tool use | **1 per turn** | Streaming response with tool execution |

Every call uses `temperature: 0` and `generateObject` with Zod validation. Claude receives verified facts (from local DB + external APIs) and reasons - it never looks up risk data itself.

### Layer 4 - Drug Lookup Pipeline

No single source is enough. QTShield runs a waterfall:

```
Input drug name
      │
      ▼
1. Exact match - local qtdrugs.json (190+ CredibleMeds drugs, <1ms)
      │  Found → done, no API call
      ▼
2. Fuzzy match on searchTerms in local database
      │  Found → done, no API call
      ▼
3. RxNorm API → canonical drug name normalization
      ▼
4. CredibleMeds API → authoritative QT risk verification
      ▼
5. OpenFDA → torsades de pointes adverse event signal detection
      ▼
6. Claude AI fallback → marked AI_ASSESSED (not CREDIBLEMEDS_VERIFIED)
      │
      ▼
Result with confidence score (0.0–1.0) + full source pipeline trace
```

### Layer 5 - Emergency Response

When a patient is in crisis:

- **SOS button** sends simultaneous SMS + voice call + email to all emergency contacts
- Each notification includes: patient location (GPS), full medication list, genotype, and prohibited drug list
- **Emergency Card** is publicly accessible at `/emergency-card/[slug]` - no login, no account, QR code scannable from a phone screen
- Supports 13 languages so ER doctors worldwide can read it
- **10-minute SOS cooldown** prevents notification spam

---

## Project Structure

```
app/
  (auth)/login              Supabase Auth login
  (auth)/signup             Supabase Auth signup
  (protected)/              All routes here require auth
    dashboard/              Home: risk overview + watch feed
    scan/                   Text + photo drug scanning
    scan/results/[id]/      Full scan result view
    medications/            Medication CRUD
    chat/                   AI assistant
    emergency-card/         Generate + manage emergency card
    doctor-prep/            Specialty-specific documents
    history/                Scan timeline
    onboarding/             First-time setup: genotype → meds → contacts
    settings/               Profile, genotype, emergency contacts
    watch/                  Watch pairing + live health dashboard
  emergency-card/[slug]/    PUBLIC - shareable ER card (no auth required)
  api/
    scan/text/              POST - text drug scan (+ /stream variant)
    scan/photo/             POST - Claude Vision photo scan
    medications/            GET/POST/DELETE - medication CRUD
    chat/                   POST - streaming AI chat with tool calling
    documents/emergency-card/   POST - generate emergency card
    documents/doctor-prep/      POST - generate doctor prep document
    watch/health/           POST - ingest watch health metrics
    watch/stream/           GET  - SSE stream to dashboard
    sos/                    POST - trigger multi-channel emergency alerts
    onboarding/             POST - save onboarding data

src/
  services/                 All business logic - nothing lives in routes
    drug-resolver.ts        Multi-source drug name resolution pipeline
    drug-scanner.ts         Scan orchestration + combo AI analysis
    document-generator.ts   Emergency card + doctor prep (AI-powered)
    watch-health.ts         Health metric processing + alert generation
    sos-notifier.ts         Twilio SMS/voice + Resend email dispatch

  ai/
    client.ts               Anthropic provider singleton
    schemas.ts              Zod schemas for every AI response
    prompts.ts              Prompt builders (genotype-aware, context-injected)

  data/
    qtdrugs.json            190+ drugs from CredibleMeds with CYP450 data

  types/index.ts            Single source of truth for all shared types
  components/               React components organized by feature
  hooks/                    use-drug-scan, use-medications
  lib/                      prisma, auth, utils

prisma/schema.prisma        Database schema (17 tables)
middleware.ts               Auth session refresh + route protection
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Anthropic API key

### Setup

```bash
git clone https://github.com/x2oreo/HeartBeat
cd HeartBeat
npm install
cp .env.example .env.local   # fill in the values below
npx prisma db push
npx prisma generate
npm run dev                   # http://localhost:3000
```

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Emergency notifications (optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
RESEND_API_KEY=re_...
```

---

## Why This Matters

LQTS is underdiagnosed. Many patients only discover they have it after surviving a cardiac event - or don't survive at all. For those who are diagnosed, every doctor visit, every prescription, every ER trip is a negotiation with a system that doesn't have their information.

QTShield doesn't replace doctors. It makes sure every doctor - regardless of specialty, country, or language - has what they need to keep this patient safe.
