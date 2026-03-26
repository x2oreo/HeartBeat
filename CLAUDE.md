# CLAUDE.md — Project Guidelines

## Stack

T3-inspired stack (Next.js + Prisma + Supabase, without tRPC for now — no separate backend yet):

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (via `@tailwindcss/postcss`)
- **Supabase** for auth (`@supabase/ssr`) — browser client in `src/lib/supabase/client.ts`, server client in `src/lib/supabase/server.ts`
- **Prisma** for database queries (`src/lib/prisma.ts` singleton) — connects to Supabase Postgres
- **Husky** pre-commit hooks

## Project Structure

```
src/
  components/
    icons.tsx          # All SVG icons live here — import from here, never inline SVGs
    DashboardLayout.tsx
    LoginPage.tsx
    HomePage.tsx
  context/
    theme.tsx          # Dark/light theme context
  lib/
    supabase.ts        # Supabase client
  App.tsx
  index.css
```

## Icons

All SVG icons are in `src/components/icons.tsx`. **Never define inline SVGs in component files.** If a new icon is needed, add it to `icons.tsx` and import it where needed.

Current exports: `HomeIcon`, `SunIcon`, `MoonIcon`, `BellIcon`, `GlobeIcon`

## Design System

### Visual Language

The app uses a **layered gray shell** aesthetic:
- **Page background**: `bg-white` / `dark:bg-neutral-950` — barely visible, peeks through as a thin border
- **App shell / panels**: `bg-neutral-100` / `dark:bg-neutral-900` — the main container wrapping everything
- **Content areas**: `bg-neutral-50` / `dark:bg-neutral-950` — slightly lighter inset panels (e.g. `<main>`)
- **Cards / elevated surfaces**: `bg-white` / `dark:bg-neutral-800` — used for form cards, dropdowns

### Rounding

Everything is rounded. Use these consistently:
- **Containers / shell**: `rounded-2xl`
- **Buttons, inputs, nav items, cards**: `rounded-xl`
- **Small UI elements** (badges, toggles): `rounded-lg`
- **Avatar**: `rounded-full`

### Typography

- Font: `'Plus Jakarta Sans'` (loaded via Google Fonts in `index.css`)
- Apply via inline style on root layout elements: `fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif"`
- Sizes: use `text-xs`, `text-sm`, `text-base` — avoid large headings in dense UI
- Weights: `font-medium` for UI labels, `font-semibold` for headings/nav

### Spacing

- Outer page padding: `p-2` on the root wrapper
- Section padding: `px-4`, `py-3`, or `p-5` for content areas
- Gaps: `gap-2`, `gap-2.5`, `gap-3`

### Sidebar

- The sidebar is **not visually separated** from the main area — both share the same gray shell background (`bg-neutral-100`)
- Width: `w-52`
- Active nav item: white pill `bg-white dark:bg-neutral-800 rounded-xl shadow-xs`
- Logo area: `w-7 h-7 rounded-xl bg-neutral-900` with inverted icon

### Topbar

- Height: `h-14`, right-aligned actions
- Contains: bell icon with notification dot, divider, profile avatar
- Profile avatar: colored circle derived from email hash, shows dropdown on click

### Buttons

Default interactive button style:
```tsx
className="... rounded-xl flex items-center justify-center text-neutral-400
  hover:bg-white dark:hover:bg-neutral-800 hover:text-neutral-700
  transition-colors cursor-pointer bg-transparent border-0"
```

Primary action button (e.g. form submit):
```tsx
className="... rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900
  hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
```

### Inputs

```tsx
className="... rounded-xl border-0 bg-neutral-100 dark:bg-neutral-700
  focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-500 transition"
```

### Dark Mode

Dark mode is class-based (`.dark` on `<html>`), managed via `ThemeContext` in `src/context/theme.tsx`. Always provide both light and dark variants for every color.

## Auth Flow

- `App.tsx` checks Supabase session on mount
- Unauthenticated → `<LoginPage />` (supports sign in, sign up, forgot password)
- Authenticated → `<DashboardLayout user={user}>` wrapping page content
- Sign out: `supabase.auth.signOut()` called from the profile dropdown

## Rules

- Do not use `class` on SVG elements — always use `className`
- Do not add `xmlns` to inline SVGs in JSX
- Prefer editing existing files over creating new ones
- Keep components focused — layout in `DashboardLayout`, page content in page components
- No default exports for components (use named exports)
