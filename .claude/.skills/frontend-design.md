# HeartGuard Design System

You are designing UI for **HeartGuard** — a medical safety app for people with Long QT Syndrome. Every design decision must serve one truth: **this app helps people avoid medications that could kill them.**

Before writing any code, internalize this system completely. Then implement with precision.

---

## Design Philosophy: "Clinical Calm"

HeartGuard sits at the intersection of **medical urgency** and **daily wellness**. The design must feel:
- **Trustworthy** — like a world-class hospital, not a startup experiment
- **Calm under pressure** — users may be stressed, scared, or in an ER
- **Instantly readable** — risk level visible in under 1 second
- **Warm but professional** — caring, not clinical-cold

**One rule above all: Design for panic.** A user checking a drug in an emergency room with shaking hands must get the answer instantly.

---

## Color System

### Brand Colors
Use CSS-friendly Tailwind classes. These are the EXACT tokens to use:

| Role | Light Mode | Dark Mode | Usage |
|------|-----------|-----------|-------|
| **Primary** | `teal-600` | `teal-400` | CTAs, links, active states, brand identity |
| **Primary Surface** | `teal-50` | `teal-950` | Primary tinted backgrounds |
| **Background** | `white` | `neutral-950` | Page background |
| **Surface** | `neutral-50` | `neutral-900` | Cards, elevated containers |
| **Surface Raised** | `white` | `neutral-800` | Modals, dropdowns, popovers |
| **Border** | `neutral-200` | `neutral-700` | Dividers, card borders |
| **Text Primary** | `neutral-900` | `neutral-50` | Headings, body text |
| **Text Secondary** | `neutral-500` | `neutral-400` | Labels, captions, metadata |
| **Text Muted** | `neutral-400` | `neutral-500` | Placeholders, disabled |

### Risk Colors (NON-NEGOTIABLE — Medical Standard)
These communicate life-or-death information. Never deviate.

| Risk Level | Background | Text | Border | Dot/Icon | Meaning |
|-----------|-----------|------|--------|----------|---------|
| **DANGER / KNOWN_RISK** | `red-50` / `dark:red-950/40` | `red-700` / `dark:red-300` | `red-200` / `dark:red-800` | `red-500` | Do NOT take this drug |
| **WARNING / POSSIBLE_RISK** | `amber-50` / `dark:amber-950/40` | `amber-700` / `dark:amber-300` | `amber-200` / `dark:amber-800` | `amber-500` | Caution — discuss with doctor |
| **CONDITIONAL** | `orange-50` / `dark:orange-950/40` | `orange-700` / `dark:orange-300` | `orange-200` / `dark:orange-800` | `orange-500` | Risky under certain conditions |
| **SAFE / NOT_LISTED** | `emerald-50` / `dark:emerald-950/40` | `emerald-700` / `dark:emerald-300` | `emerald-200` / `dark:emerald-800` | `emerald-500` | Safe to take |

### How to Apply Risk Colors
```
// Risk badge (small inline indicator)
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
  bg-red-50 text-red-700 ring-1 ring-red-200
  dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800">
  <span className="size-1.5 rounded-full bg-red-500" />
  Known Risk
</span>

// Risk card (full result container)
<div className="rounded-2xl border-2 border-red-200 bg-red-50/50
  dark:border-red-800 dark:bg-red-950/30 p-5">
  ...
</div>

// Risk banner (top-of-page alert)
<div className="flex items-center gap-3 px-4 py-3 rounded-xl
  bg-red-600 text-white font-semibold">
  <ShieldAlert className="size-5 shrink-0" />
  This medication is dangerous for Long QT Syndrome
</div>
```

### Accent Colors for Features
| Feature | Color | Usage |
|---------|-------|-------|
| Emergency Card | `red-600` header, `red-50` body | Urgency, medical alert |
| Doctor Prep | `blue-600` header, `blue-50` body | Professional, clinical |
| Scan / Search | `teal-600` | Primary brand action |
| Dashboard | Neutral + risk colors | Overview, calm |
| Onboarding | `teal-500` to `cyan-500` gradient | Welcoming, progressive |

---

## Typography

### Font Stack
**Primary:** `'Plus Jakarta Sans'` — already configured, keep it. It's modern, friendly, highly readable, and has excellent weight range.

**Fallback:** `'DM Sans', system-ui, sans-serif`

### Type Scale
| Element | Class | Weight | Usage |
|---------|-------|--------|-------|
| Page Title | `text-2xl` | `font-bold` | Top of each page |
| Section Heading | `text-lg` | `font-semibold` | Card titles, section headers |
| Card Title | `text-base` | `font-semibold` | Drug names, list item titles |
| Body | `text-sm` | `font-normal` | Descriptions, explanations |
| Caption | `text-xs` | `font-medium` | Labels, metadata, timestamps |
| Overline | `text-[11px] uppercase tracking-widest` | `font-semibold` | Section labels, categories |

### Typography Rules
- Use `tracking-tight` on headings `text-xl` and above
- Use `leading-relaxed` on body text for readability
- Medical terms: `font-medium` to make them stand out in body text
- Drug names: always `font-semibold` — they're the most important text on screen
- Never go below `text-xs` (12px) — medical app, readability is life-critical

---

## Spacing & Layout

### Spacing Scale
- **Page padding:** `px-4 py-6` mobile, `px-6 py-8` desktop
- **Card padding:** `p-4` compact, `p-5` standard, `p-6` spacious
- **Section gap:** `space-y-6` between major sections
- **Item gap:** `space-y-3` between list items
- **Inline gap:** `gap-2` to `gap-3` for horizontal layouts
- **Touch target minimum:** `min-h-[44px]` on all interactive elements (Apple HIG)

### Layout Principles
1. **Single column on mobile** — no side-by-side layouts below 640px
2. **Max content width:** `max-w-lg` (512px) for forms and scan results — prevents eye strain
3. **Sticky headers** for context — user always knows where they are
4. **Bottom-anchored CTAs** on mobile for thumb reach: `fixed bottom-0 inset-x-0 p-4`
5. **Card-based information architecture** — each piece of info in its own container

---

## Component Patterns

### Cards
```
// Standard card
<div className="rounded-2xl bg-white dark:bg-neutral-900
  border border-neutral-200 dark:border-neutral-700
  p-5 space-y-3">

// Elevated card (important content)
<div className="rounded-2xl bg-white dark:bg-neutral-900
  shadow-lg shadow-neutral-200/50 dark:shadow-neutral-950/50
  border border-neutral-100 dark:border-neutral-800
  p-5 space-y-3">

// Risk-tinted card
<div className="rounded-2xl bg-red-50/50 dark:bg-red-950/20
  border border-red-200 dark:border-red-800
  p-5 space-y-3">
```

### Buttons
```
// Primary CTA (scan, save, generate)
<button className="w-full flex items-center justify-center gap-2
  h-12 px-6 rounded-xl
  bg-teal-600 hover:bg-teal-700 active:bg-teal-800
  dark:bg-teal-500 dark:hover:bg-teal-600
  text-white font-semibold text-sm
  transition-colors duration-150
  disabled:opacity-50 disabled:cursor-not-allowed">

// Secondary
<button className="h-10 px-4 rounded-xl
  bg-neutral-100 hover:bg-neutral-200
  dark:bg-neutral-800 dark:hover:bg-neutral-700
  text-neutral-700 dark:text-neutral-200
  font-medium text-sm transition-colors">

// Danger
<button className="h-10 px-4 rounded-xl
  bg-red-600 hover:bg-red-700
  text-white font-semibold text-sm transition-colors">

// Ghost
<button className="h-10 px-4 rounded-xl
  hover:bg-neutral-100 dark:hover:bg-neutral-800
  text-neutral-600 dark:text-neutral-300
  font-medium text-sm transition-colors">
```

### Input Fields
```
<input className="w-full h-11 px-4 rounded-xl
  bg-neutral-100 dark:bg-neutral-800
  border-0
  text-neutral-900 dark:text-neutral-100
  placeholder:text-neutral-400 dark:placeholder:text-neutral-500
  text-sm
  focus:outline-none focus:ring-2 focus:ring-teal-500/40
  transition-shadow" />
```

### Risk Badges (Pill)
```
// Use these exact patterns for consistency
const riskBadgeClasses = {
  KNOWN_RISK: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800",
  POSSIBLE_RISK: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
  CONDITIONAL_RISK: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800",
  NOT_LISTED: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
}
```

### Loading States
```
// Skeleton pulse
<div className="animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800 h-24" />

// Scan in progress (use a heartbeat animation)
<div className="flex flex-col items-center gap-3 py-12">
  <div className="size-12 rounded-full bg-teal-100 dark:bg-teal-900/30
    flex items-center justify-center animate-pulse">
    <HeartPulse className="size-6 text-teal-600 dark:text-teal-400" />
  </div>
  <p className="text-sm text-neutral-500 dark:text-neutral-400">
    Analyzing medication safety...
  </p>
</div>
```

### Empty States
```
<div className="flex flex-col items-center gap-3 py-16 text-center">
  <div className="size-12 rounded-full bg-neutral-100 dark:bg-neutral-800
    flex items-center justify-center">
    <Icon className="size-6 text-neutral-400" />
  </div>
  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
    No medications added yet
  </p>
  <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-[240px]">
    Add your current medications to get personalized safety alerts
  </p>
</div>
```

---

## Interaction Patterns

### Micro-interactions
- **Button press:** `active:scale-[0.98]` for tactile feedback
- **Card hover (desktop):** `hover:shadow-md transition-shadow duration-200`
- **Risk result reveal:** fade in + slide up: `animate-in fade-in slide-in-from-bottom-2 duration-300`
- **Page transitions:** keep minimal — speed > flair in a medical app

### Haptic Moments (conceptual, for future native)
- Red result → strong vibration
- Green result → gentle tap
- Scan complete → double tap

---

## Page-Specific Design Notes

### Scan Page (the HERO page)
- Giant search input, front and center
- "Scan" button is the largest touch target on the page
- Results appear inline below — no page navigation
- Risk color fills the entire result card background
- Drug name is the largest text. Risk level is second.
- Alternatives section uses green-tinted cards

### Dashboard
- Greeting: "Hi {name}" — warm, personal
- Risk summary card at top with medication count by risk level
- Quick scan shortcut — prominent teal CTA
- Recent scans as a compact timeline

### Emergency Card
- RED header — unmistakable urgency
- Patient name + condition in largest possible text
- "DO NOT ADMINISTER" list with high contrast
- QR code for digital version
- Designed to be understood by an ER doctor in 5 seconds

### Onboarding
- Step indicator with teal progress
- One question per screen — no overwhelming forms
- Warm, encouraging copy
- Skip options for non-critical fields

---

## Dark Mode Rules

1. Never just invert colors — dark mode has its own personality
2. Backgrounds go dark (`neutral-950`, `neutral-900`) but risk colors stay vivid
3. Use `/40` or `/30` opacity for risk background tints in dark mode
4. Borders lighten slightly (`neutral-700`) but stay subtle
5. Shadows become darker and more diffused
6. Text contrast: minimum 4.5:1 ratio (WCAG AA)

---

## Anti-Patterns (NEVER do these)

- **Never** hide risk level behind a tap/click — it must be visible immediately
- **Never** use red for non-danger UI (buttons, links, decorative elements)
- **Never** use small text for drug names or risk levels
- **Never** use low-contrast text for medical information
- **Never** auto-dismiss alerts or results — user controls when to leave
- **Never** use playful animations on danger screens
- **Never** use skeleton loaders that look like green/safe results before real data loads
- **Never** use generic stock illustrations — prefer icons and data visualization
- **Never** place critical actions (scan, emergency) in hamburger menus

---

## Medical Disclaimer Pattern

Every scan result and document must include:

```
<p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500 text-center mt-6">
  This information is for reference only and does not replace professional medical advice.
  Always consult your cardiologist or pharmacist before starting any new medication.
</p>
```

---

## Implementation Checklist

When building any HeartGuard page or component:
- [ ] Works at 375px width (mobile-first)
- [ ] All touch targets >= 44px
- [ ] Risk colors follow the exact system above
- [ ] Dark mode looks intentional, not inverted
- [ ] Loading state exists for every async operation
- [ ] Error state exists with retry option
- [ ] Medical disclaimer where applicable
- [ ] No horizontal scroll on mobile
- [ ] Font sizes never below `text-xs`
- [ ] Drug names are always `font-semibold`
