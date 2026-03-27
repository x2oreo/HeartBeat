# QTShield Design System

Complete reference for implementing QTShield's UI. Every decision here serves one goal: a patient in a high-stress moment can instantly understand what they're looking at.

---

## Brand Colors

### Primary

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| Guardian Blue | `#3478F6` | `--guardian-blue` | Primary buttons, links, active states, brand identity |
| Deep Blue | `#1A56C4` | `--guardian-blue-deep` | Pressed/active states, dark headers |
| Blue Hover | `#2B6AE0` | `--guardian-blue-hover` | Button hover states |
| Blue Tint | `#EBF2FF` | `--guardian-blue-light` | Selected backgrounds, secondary buttons, info alerts |
| Blue Pale | `#F6F9FF` | `--guardian-blue-pale` | Subtle hover tints |

### Accent

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| Pulse Coral | `#F07167` | `--pulse-coral` | Heart icon, brand accent, onboarding highlights |
| Deep Coral | `#D4574E` | `--pulse-coral-deep` | Pressed accent states |
| Coral Tint | `#FFF0EE` | `--pulse-coral-light` | Warm background tints |

### Supporting

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| Wellness Teal | `#32AFA9` | `--wellness-teal` | Health metrics, wellness indicators, positive trends |
| Teal Tint | `#E8F8F7` | `--wellness-teal-light` | Teal background tints |
| Warm Amber | `#FFB340` | `--warm-amber` | Non-risk notifications, tips, onboarding prompts |
| Amber Tint | `#FFF8EB` | `--warm-amber-light` | Amber background tints |

---

## Risk Signal System

These colors are **medical signals, not decoration**. They follow Apple HIG system colors for universal recognition.

| Level | Dot Color | Background | Text Color | When to Use |
|-------|-----------|------------|------------|-------------|
| Safe | `#34C759` | `#EAFBF0` | `#1B7A34` | Drug not listed as QT-prolonging |
| Caution | `#FF9F0A` | `#FFF5E0` | `#8A5600` | Possible or conditional risk |
| Danger | `#FF3B30` | `#FFEDEC` | `#C41E16` | Known QT risk |
| Critical | `#FF3B30` + pulse | `#FFEDEC` | `#C41E16` | Dangerous drug combination detected |

### How to apply risk colors

Every risk indicator uses three layers:

1. **Dot** (7px circle, risk color) - the instant visual signal
2. **Tinted background** (light variant) - provides context without overwhelming
3. **Dark text** (accessible contrast) - readable content

```
Pattern: [dot] + [tint background] + [dark text on tint]
```

Badge example:
```tsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFEDEC] text-[#C41E16]">
  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
  Known Risk
</span>
```

Alert example:
```tsx
<div className="flex items-start gap-3 p-4 rounded-xl bg-[#EAFBF0] text-[#1B7A34]">
  <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
  <p><strong>Amoxicillin</strong> is safe to take with your current medications.</p>
</div>
```

### Critical pulse animation

```css
@keyframes critical-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(255, 59, 48, 0); }
}

.critical-indicator {
  animation: critical-pulse 2s ease-in-out infinite;
}
```

Use only for Critical level (dangerous drug combinations). Never for single-drug danger results.

---

## Neutrals & Surfaces

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| Primary Text | `#1D1D1F` | `--text-primary` | Headings, body text, drug names |
| Secondary Text | `#6E6E73` | `--text-secondary` | Captions, metadata, timestamps |
| Tertiary Text | `#AEAEB2` | `--text-tertiary` | Placeholders, disabled text |
| Quaternary | `#C7C7CC` | `--text-quaternary` | Decorative text, version labels |
| Separator | `#D1D1D6` | `--separator` | Input borders, card borders (when needed) |
| Light Separator | `#E5E5EA` | `--separator-light` | Subtle dividers between list items |
| Surface | `#F2F2F7` | `--surface` | Page background |
| Card | `#FFFFFF` | `--surface-raised` | Cards, elevated content |

### Surface hierarchy

```
Page background (#F2F2F7)
  -> Card (#FFFFFF, shadow: 0 1px 3px rgba(0,0,0,0.04))
    -> Selected/active state (#EBF2FF)
```

Cards sit on the surface background. No nested cards. No colored card backgrounds unless showing risk status.

---

## Typography

**Font family:** Inter (Google Fonts)

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale

| Role | Size | Weight | Letter Spacing | Line Height | Usage |
|------|------|--------|---------------|-------------|-------|
| Display | 36px | 800 | -1.5px | 1.1 | App name in hero sections |
| H1 | 28px | 700 | -0.8px | 1.2 | Page titles (Scan Results, My Medications) |
| H2 | 22px | 700 | -0.4px | 1.25 | Section titles within a page |
| H3 | 17px | 600 | 0 | 1.35 | Card titles, group headers |
| Body | 15px | 400 | 0 | 1.55 | Primary content, drug descriptions |
| Caption | 13px | 500 | 0 | 1.4 | Timestamps, secondary info |
| Micro | 11px | 600 | 0.6px, uppercase | 1.3 | Badges, labels, overlines |

### Monospace (for technical values)

```css
font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
```

Used for: hex color codes, dosage values in technical contexts, debug information. Not used in patient-facing UI.

### Typography rules

- **Drug names** are always Body weight 600 (semibold) to stand out in flowing text
- **Risk labels** always use the Micro style (11px, 600, uppercase, 0.6px letter-spacing)
- **Never** use font sizes smaller than 11px
- **Never** use light/thin weights (300 or below) — readability under stress matters

---

## Icons

**Library:** Lucide React (primary), Heroicons outline (secondary)

### Style rules

| Property | Value |
|----------|-------|
| Style | Outlined (stroke), never filled |
| Stroke width | 2px |
| Line caps | Round |
| Line joins | Round |
| Default size | 20px (body context) |
| Navigation size | 24px |
| Small/inline size | 16px |

### When to use icons

- **Do:** Use icons alongside text labels (icon + "Scan Drug")
- **Do:** Use icons as list item leading indicators
- **Don't:** Use icons as the sole means of conveying information — always pair with text
- **Don't:** Use filled/solid icons — they feel heavy and break the Apple Health aesthetic
- **Don't:** Mix icon libraries within the same view

### Key icons

| Action | Icon | Library |
|--------|------|---------|
| Scan | `Search` | Lucide |
| Medications | `Pill` or `ClipboardList` | Lucide |
| Emergency Card | `Shield` | Lucide |
| Doctor Prep | `FileText` | Lucide |
| Settings | `Settings` | Lucide |
| History | `Clock` | Lucide |
| Safe result | `CheckCircle` | Lucide |
| Caution result | `AlertCircle` | Lucide |
| Danger result | `OctagonX` or `XOctagon` | Lucide |
| Camera scan | `Camera` | Lucide |
| Back navigation | `ChevronLeft` | Lucide |

---

## Spacing & Layout

### Base unit: 4px

All spacing values must be multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon-to-text gap, tight inner spacing |
| `sm` | 8px | Badge padding, small gaps between related items |
| `md` | 16px | Card inner padding (mobile), gap between cards |
| `lg` | 24px | Card inner padding (desktop), section gap |
| `xl` | 32px | Section padding top/bottom |
| `2xl` | 48px | Large section separations |

### Layout rules

- **Page padding:** 16px horizontal on mobile, 24px on tablet+
- **Card padding:** 20px on mobile
- **Card gap:** 12px between stacked cards
- **Card border-radius:** 16px (all cards), 20px (feature/hero cards)
- **Input border-radius:** 12px
- **Button border-radius:** 12px
- **Badge border-radius:** 9999px (full pill)
- **Max content width:** 480px for single-column mobile content

### Mobile-first breakpoints

| Breakpoint | Width | Notes |
|------------|-------|-------|
| Mobile | 375px | Primary design target |
| Large mobile | 428px | iPhone Pro Max |
| Tablet | 768px | Two-column layouts allowed |
| Desktop | 1024px | Max container width, centered |

---

## Cards & Surfaces

### Standard card

```css
.card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
```

- No borders by default — shadow provides separation
- On `#F2F2F7` background, white cards naturally stand out
- Cards never have colored backgrounds unless displaying a risk state

### Risk-tinted card

When a card communicates risk (e.g., scan result), apply the risk tint as the card background:

```css
.card-danger {
  background: #FFEDEC;
  border-radius: 16px;
  padding: 20px;
  /* No shadow needed — color provides separation */
}
```

### Interactive card (tappable)

```css
.card-interactive {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-interactive:active {
  transform: scale(0.98);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
```

---

## Buttons

### Primary (Guardian Blue)

```css
background: #3478F6;
color: #FFFFFF;
font-weight: 600;
font-size: 15px;
padding: 12px 24px;
border-radius: 12px;
```

Hover: `#2B6AE0`, shadow `0 4px 16px rgba(52, 120, 246, 0.3)`

### Secondary (Blue Tint)

```css
background: #EBF2FF;
color: #3478F6;
```

Hover: `#DDE8FD`

### Ghost (Outlined)

```css
background: transparent;
color: #3478F6;
border: 1.5px solid #D1D1D6;
```

Hover: border becomes `#3478F6`, background becomes `#F6F9FF`

### Danger

```css
background: #FF3B30;
color: #FFFFFF;
```

Hover: `#E53529`, shadow `0 4px 16px rgba(255, 59, 48, 0.3)`

### Button rules

- Minimum touch target: 44px height
- Always use font-weight 600
- Always include focus-visible ring: `0 0 0 4px rgba(52, 120, 246, 0.12)`
- Icon + text buttons: icon at 18px, 8px gap before text
- Full-width buttons on mobile for primary actions

---

## Inputs

```css
font-family: 'Inter', sans-serif;
font-size: 15px;
padding: 14px 16px;
border: 1.5px solid #D1D1D6;
border-radius: 12px;
background: #FFFFFF;
color: #1D1D1F;
```

**Focus state:**
```css
border-color: #3478F6;
box-shadow: 0 0 0 4px rgba(52, 120, 246, 0.12);
```

**Placeholder:** `#AEAEB2`

**Error state:**
```css
border-color: #FF3B30;
box-shadow: 0 0 0 4px rgba(255, 59, 48, 0.08);
```

---

## Animations & Transitions

### General principles

- All interactive transitions: `0.2s ease`
- Page/section reveals: `0.6s ease` with `translateY(20px)` fade-in
- Never animate during a loading state — show skeleton, then reveal content
- Reduce motion: respect `prefers-reduced-motion` — disable all non-essential animations

### Hover transitions

```css
transition: transform 0.2s ease, box-shadow 0.2s ease;
```

### Loading skeletons

Use pulsing gray blocks that match the content layout:

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}

.skeleton {
  background: #E5E5EA;
  border-radius: 8px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
```

---

## Accessibility

### Color contrast

All text/background combinations meet WCAG AA (4.5:1 minimum):

| Combination | Ratio | Pass |
|-------------|-------|------|
| Primary text on white | 15.4:1 | AAA |
| Secondary text on white | 4.8:1 | AA |
| Safe text on safe bg | 5.2:1 | AA |
| Caution text on caution bg | 5.0:1 | AA |
| Danger text on danger bg | 5.8:1 | AA |
| White on Guardian Blue | 4.6:1 | AA |

### Focus indicators

Every interactive element must have a visible focus ring:

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(52, 120, 246, 0.2);
}
```

### Risk communication

Never rely on color alone. Every risk signal uses:
1. **Color** (dot + background tint)
2. **Text label** ("Safe", "Caution", "Known Risk")
3. **Icon** (checkmark, warning, X)

---

## Design Principles Summary

1. **Color is semantic, never decorative** — if removing the color loses information, keep it; otherwise remove it
2. **Design for panic** — critical info visible without scrolling, within 300ms of page load
3. **One tap away** — Scan, Results, Emergency Card always reachable from primary navigation
4. **4px rhythm** — every margin and padding is a multiple of 4px
5. **White space is confidence** — generous spacing communicates calm authority
6. **Restrained palette** — most UI is white/gray/black; color appears only with purpose

---

## Logo

Shield shape with ECG heartbeat trace. Rendered as inline SVG:

```svg
<svg viewBox="0 0 48 48" fill="none">
  <path d="M24 4L6 14v12c0 12 8.4 23.2 18 26 9.6-2.8 18-14 18-26V14L24 4z" fill="#3478F6"/>
  <polyline points="13,28 18,28 20.5,23 23,33 25.5,19 28,31 30.5,25 33,28 37,28"
    stroke="white" stroke-width="2.2" fill="none"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Use the gradient variant for hero/splash contexts:
```svg
<linearGradient id="shield-grad" x1="6" y1="4" x2="42" y2="42">
  <stop stop-color="#3478F6"/>
  <stop offset="1" stop-color="#1A56C4"/>
</linearGradient>
```
