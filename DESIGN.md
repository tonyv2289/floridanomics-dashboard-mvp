# Design System — Florida Brain

*Generated 2026-05-19 by `/design-consultation`. Florida Brain is the parent content + data brand. The Floridanomics dashboard is its primary data surface. This document binds visual decisions across the dashboard, videos, social shorts, executive briefings, and speaker decks.*

> **The thesis: Florida's Bloomberg. Not Florida's startup template.**
> Every Florida media / state-data brand defaults to one of three slots: white-paper PDF (FC100, SelectFlorida), print-magazine traditional (Florida Trend), or bloggy/casual (Refresh Miami). Nobody owns "Bloomberg Terminal of Florida" — credibly data-heavy, executive, opinionated, dark-default, editorial typography with restraint. **Florida Brain claims that register.**

---

## Product Context

- **What this is:** Florida Brain — a multi-surface content/data brand covering Florida innovation, capital, NatSec, trade, and policy. Surfaces: the Floridanomics dashboard (live web), Florida Brain video (long + short form), executive briefings, speaker decks, social
- **Who it's for:** Florida CEOs, policymakers, investors, family offices, international FDI prospects, eMerge Americas sponsors and partners
- **Space/industry:** Regional economic media + executive data tooling + B2B content
- **Project type:** Multi-surface system — web dashboard (React/TS/Vite) + episodic video (Gemini Omni era) + executive briefings (PDF/HTML) + social shorts

---

## Aesthetic Direction

- **Direction:** Editorial / Executive Briefing — magazine-grade typographic hierarchy with restrained palette
- **Decoration level:** Intentional — subtle grain on dark surfaces, never decorative blobs or icons-in-circles
- **Mood:** Briefing-room credibility. Confident, opinionated, dark-default, warm-accent. Slower pace than startup template, more weight on typography than UI density. Reads as "considered" without "precious"
- **Reference register:** Bloomberg Terminal (data weight), FT Weekend (editorial pace), Information Architects (restraint), kurzgesagt (narrative clarity in video). NOT Linear, NOT Vercel, NOT generic SaaS template

---

## Typography

- **Display / Hero / Video title cards:** **Sora** weights 700 / 800
  - *Why:* Geometric sans with character. Slightly retro-futurist. Recognizable across surfaces without being trendy. Already loaded in the dashboard
- **Body / Long-form / Briefings:** **Manrope** weights 400 / 500
  - *Why:* Refined humanist sans with great rhythm. Modern but warm. Already loaded
- **UI / Labels / Tabs / Kickers:** **Manrope** weight 600, uppercase, letter-spacing 0.08-0.12em
  - *Why:* Single workhorse for everything UI keeps typography stack lean
- **Data / Tables / Numerics:** **Manrope** weight 700 with `font-variant-numeric: tabular-nums`
  - *Why:* Saves a font-load while keeping data legible. Upgrade to **Geist Mono** later if data tables become the primary surface
- **Code:** Geist Mono (only if/when needed)
- **Loading strategy:** `@fontsource/sora` + `@fontsource/manrope` self-hosted (already installed). `font-display: swap`. Preload the two display weights
- **Type scale (modular 1.25):**
  | Token | Size | Use |
  |---|---|---|
  | display-1 | 64-88px (clamp) | Hero, video title |
  | display-2 | 40px | Section openers |
  | h1 | 32px | Stat values, briefing headings |
  | h2 | 24px | Sub-sections |
  | h3 | 20px | Card headlines |
  | body-lg | 18px | Long-form briefings |
  | body | 16px | Default body |
  | small | 13px | UI labels (with 0.04em letter-spacing) |
  | micro | 11px | Kickers (with 0.12em letter-spacing, uppercase) |

---

## Color

- **Approach:** Restrained — one accent rule per surface, never two. Color is rare and meaningful
- **Surfaces:**
  - **Navy (primary surface):** `#02060d` — deep near-black, slight blue lift
  - **Card:** `#0a1024` — first-elevation card surface
  - **Card Elev:** `#111934` — second elevation (cards within cards, dropdowns)
- **Text on dark:**
  - **Body:** `#e8eef9` — warm off-white. NEVER pure `#ffffff` on dark
  - **Muted:** `#94a3b8` — cool gray-blue for secondary info, kickers, captions
  - **Border / divider:** `rgba(148,163,184,0.18)` — subtle dividers
- **Accents (THE Florida Brain palette):**
  - **Florida Sun:** `#ff8f3f` — the ONLY non-data accent. Primary CTA, single bar highlight, lead-stat color, video accent rule, tab underline. This is the brand color
  - **Atlantic Teal:** `#56c2ff` — second data series, secondary CTA borders
- **Semantic:**
  - **Growth / success:** `#3ee8b0`
  - **Decline / warning:** `#ff70a8`
  - **Error:** reuse `#ff70a8` with bold weight
  - **Info:** reuse `#56c2ff`
- **Dark mode strategy:** Dark IS the default. A light-mode variant will redesign surfaces (not invert lightness) when added. Florida Sun stays the same hex in both modes; Atlantic Teal desaturates 15% in light mode
- **AGAINST:**
  - **No purple / violet ANYWHERE.** Common AI-slop default
  - **No gradient backgrounds.** Single radial-glow at <8% opacity is the maximum
  - **No third accent color.** If a data view needs more series, use desaturated variants of teal + sun
  - **No pure white text** on dark surfaces

---

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable (this is briefing, not surveillance)
- **Scale:**
  | Token | Value |
  |---|---|
  | 2xs | 2px |
  | xs | 4px |
  | sm | 8px |
  | md | 16px |
  | lg | 24px |
  | xl | 32px |
  | 2xl | 48px |
  | 3xl | 64px |
  | 4xl | 96px |
- **Rhythm:** Section gaps use 96px on desktop, 64px on tablet, 48px on mobile

---

## Layout

- **Approach:** Hybrid — grid-disciplined for data views (dashboard, infographics), editorial for narrative views (video chapter cards, hero, headlines)
- **Grid:** 12-column desktop, 8-column tablet, 4-column mobile
- **Max content width:**
  - Briefing / editorial: 720px (45-75 chars per line)
  - Dashboard: 1100px
  - Hero / landing: 1280px
- **Breakpoints:** mobile 375, tablet 768, desktop 1024, wide 1440
- **Border radius hierarchy:** sm 4px (inputs, chips), md 8px (cards, swatches), lg 12px (large surfaces), full 9999px (avatars only)
- **Inner radius rule:** inner = outer − gap

---

## Motion

- **Approach:** Intentional — animation communicates state change or spatial relationship, never decoration
- **Easing:**
  - Enter: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out)
  - Exit: `cubic-bezier(0.7, 0, 0.84, 0)` (ease-in)
  - Move: `cubic-bezier(0.65, 0, 0.35, 1)` (ease-in-out)
- **Duration:**
  - Micro: 50-100ms (hovers, button presses)
  - Short: 150-250ms (UI state changes)
  - Medium: 250-400ms (panel reveals, modals)
  - Long: 400-700ms (page transitions, hero reveals)
- **Hero data reveal:** 60ms stagger between hero card numbers on first paint
- **`prefers-reduced-motion: reduce` respected** — all motion collapses to opacity transitions only
- **AGAINST:** Scroll-driven parallax. Bouncy springs on data. Auto-playing animations beyond first paint. Transition on `all` (always list properties)

---

## Component Anti-Patterns (Never)

Hard list — anything below disqualifies a surface from shipping as Florida Brain:

- Purple / violet gradients (the #1 AI-slop signal)
- 3-column feature grid with icons in colored circles (the SaaS starter template look)
- Centered everything with uniform spacing
- Uniform bubbly border-radius on every element
- Gradient buttons as primary CTA
- Generic stock-photo hero sections
- Decorative blobs, floating circles, wavy SVG dividers
- Emoji as design elements (rockets in headings, emoji bullets)
- Colored left-border on cards (`border-left: 3px solid <accent>`) — pull quote is the only exception
- Generic hero copy ("Welcome to...", "Unlock the power of...", "Your all-in-one...")
- Inter / Roboto / Arial / Helvetica / Open Sans / Lato / Montserrat / Poppins as primary face
- Pure white text on dark surface
- Em dashes (—) anywhere in copy. Ever. Use comma + clause or sentence break instead

## Video-Specific Anti-Patterns (Never)

- Drone-spinning-around-skyline cliché
- Tropical-pink-sunset slop
- Neon Miami Vice gradient overlays
- Stock-music whoosh transitions
- Time-lapse traffic shots with motion blur
- "Coming soon" rotating text animations
- Lower-thirds with multiple colors at once
- More than one accent rule on screen at a time

---

## Brand Voice (binding with `tj_writing_style.md`)

- **Tone:** Data-driven, confident, forward-looking. "McKinsey meets How I Built This"
- **Posture:** Declarative, no hedging. Never "I think" or "we believe". State the thing
- **Hook:** First 3 seconds (video) or first sentence (text) earns the next 27 seconds
- **Sign-off:** "Florida Forever" for warm/closer copy; "Best regards" for cold reopens
- **No em dashes.** Comma + clause or hard sentence break

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-19 | Initial DESIGN.md created via `/design-consultation` | Established brand spine across all Florida Brain surfaces |
| 2026-05-19 | Sora + Manrope locked as the type stack | Both already loaded in dashboard via @fontsource; both pass the no-overused-fonts filter; pair carries video + dashboard under one voice |
| 2026-05-19 | Florida Sun (#ff8f3f) locked as single non-data accent | Already in dashboard; no Florida media owns warm orange; pairs with sunshine-economy narrative without literal flag-coding |
| 2026-05-19 | Editorial / Executive Briefing aesthetic chosen | Unowned register in FL media space (Layer 3 first-principles insight); matches "premium executive dashboard feel" already stated in dashboard README |
| 2026-05-19 | Em dashes forbidden | Carries forward from `tj_writing_style.md` |
