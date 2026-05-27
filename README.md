# Floridanomics Dashboard

Florida Brain's public data surface for Florida economic, innovation, and trade intelligence.

## Current product state

- `v2` is the current launch-default dashboard
- `v1` is preserved behind compare mode for fallback and review
- Compare routes:
  - `?compare=1&version=v2`
  - `?compare=1&version=v1`

The live `v2` experience is built around three tabs:

1. `Florida Scorecard`
2. `Innovation + Econ Dev`
3. `International Trade`

It also includes the newer editorial and Florida-specific sections that make the product more than a generic KPI board:

- `2030 Trajectory`
- `Snowbird Index` proxy
- `Space Coast Cadence`
- `LATAM Gateway`
- chart and metric-card interpretation copy
- branded Open Graph and Twitter share previews

## Product intent

This is not a generic state dashboard. The target register is "Florida's Bloomberg":

- Florida only
- executive briefing feel
- editorial framing, not just charts
- screenshot-ready for speeches, decks, WhatsApp shares, and policy/investor discussions
- grounded in verified public sources plus curated Florida-specific context

## Tech stack

- `React + TypeScript + Vite`
- `Recharts`
- static dataset contract in `public/data/florida-economy.json`
- `tsx` scripts for refresh and validation

## Quick start

```bash
npm install
npm run data:refresh
npm run data:validate
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Full QA sweep:

```bash
npm run qa:full
```

## Data model

`public/data/florida-economy.json` is a merged product dataset with two layers:

1. **Refreshed core metrics**
   - BLS labor market and payroll data
   - Census-sourced population via FRED `FLPOP`
   - FRED business applications and real GSP indicators

2. **Curated verified sections**
   - `scorecard2030`
   - `distinctives.snowbirdIndex`
   - `distinctives.spaceCoastCadence`
   - `distinctives.latamGateway`
   - `trade`

`npm run data:refresh` updates the dynamic labor, population, metro, industry, and innovation metrics while preserving the curated `v2` sections and their source links. That is intentional so a routine refresh cannot wipe the differentiated Florida-specific product work.

More detail: [docs/data-sources.md](/Users/pelayopro/Desktop/floridanomics-dashboard-rewrite/docs/data-sources.md) and [docs/refresh-runbook.md](/Users/pelayopro/Desktop/floridanomics-dashboard-rewrite/docs/refresh-runbook.md).

## Validation

```bash
npm run data:validate
```

The validator now checks both the refreshed core metrics and the richer `v2` product sections, including insight blocks and trade structure.

## Deployment

GitHub Pages publishes from the repo with the fixed base path:

- production URL: `https://tonyv2289.github.io/floridanomics-dashboard-mvp/`
- social preview image: `public/og-image.png`

Push to `main` or run the deploy workflow to publish.

## Repo structure

```text
floridanomics-dashboard-rewrite/
  docs/
    data-sources.md
    refresh-runbook.md
    security-audit.md
    v2-roadmap.md
  public/
    data/
      florida-economy.json
    og-image.png
  scripts/
    refresh-data.ts
    validate-data.ts
  src/
    components/
      FloridaMsaMap.tsx
    hooks/
      useDashboardData.ts
    lib/
      dashboard.ts
    types/
      dashboard.ts
    v1/
      LegacyDashboard.tsx
    v2/
      DashboardV2.tsx
      dashboard-v2.css
    App.tsx
    app-frame.css
    index.css
    main.tsx
  DESIGN.md
  index.html
```

## Design direction

Bound by [DESIGN.md](/Users/pelayopro/Desktop/floridanomics-dashboard-rewrite/DESIGN.md):

- deep navy primary surface
- Sora + Manrope
- Florida Sun as the only non-data accent
- editorial hierarchy over startup-template UI
- no purple, no gradient slop, no icons-in-circles

## What comes next

See [docs/v2-roadmap.md](/Users/pelayopro/Desktop/floridanomics-dashboard-rewrite/docs/v2-roadmap.md) for the post-launch roadmap and remaining product gaps.
