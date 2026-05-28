# Floridanomics Dashboard

Florida Brain's public data surface for Florida economic, innovation, and trade intelligence.

## Current product state

- `v3` is the current launch-default dashboard
- `v2` and `v1` are preserved behind compare mode for fallback and review
- Compare routes:
  - `?compare=1&version=v3`
  - `?compare=1&version=v2`
  - `?compare=1&version=v1`

The live `v3` experience is built around six top-level tabs:

1. `Brief`
2. `Competition`
3. `Terminal`
4. `Scorecard`
5. `Innovation`
6. `Trade`

`Competition` is the operating menu for:

- `US Metros`: South Florida, Tampa, Orlando, Jacksonville, Austin, Seattle, Boston, Chicago, and Nashville
- `International Metros`: Miami vs Dubai, Riyadh, Taipei, and Singapore
- `Strategy`: peers, clusters, scenarios
- `FDI / Tools / Capacity`: capital intensity, incentives, institutions, semiconductors

It also includes the newer editorial and Florida-specific sections that make the product more than a generic KPI board:

- `2030 Trajectory`
- `Snowbird Index` proxy
- `Space Coast Cadence`
- `LATAM Gateway`
- Florida Brain Notes
- Strategy cockpit with peer-state BLS benchmarks, cluster strategy, talent pipeline, metro momentum, and scenarios
- State competition terminal with metro comparisons, FDI Observatory scores, peer-state FDI deltas, policy-toolkit, institutional-capacity, semiconductor, and federal data spine layers
- Florida Model terminal with AI capex index, forecasts, policy memos, and evidence blocks
- AI Capex Gap public HTML brief
- chart and metric-card interpretation copy
- branded Open Graph and Twitter share previews

## Product intent

This is not a generic state dashboard. The target register is "Florida's Bloomberg":

- Florida only
- executive briefing feel
- editorial framing, not just charts
- screenshot-ready for speeches, decks, WhatsApp shares, and policy/investor discussions
- grounded in verified public sources plus curated Florida-specific context
- connected to Florida Brain notes and HTML briefs that turn a dashboard read into a shareable intelligence artifact

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
   - Federal feed-status layer for BLS, Census, BEA, EIA, and IRS

2. **Curated verified sections**
   - `scorecard2030`
   - `brainNotes`
   - `strategy`
   - `competition`
   - `federal`
   - `terminal`
   - `distinctives.snowbirdIndex`
   - `distinctives.spaceCoastCadence`
   - `distinctives.latamGateway`
   - `trade`

`npm run data:refresh` updates the dynamic labor, population, metro, industry, innovation, and peer-state benchmark metrics while preserving the curated sections, Florida Brain notes, and source links. That is intentional so a routine refresh cannot wipe the differentiated Florida-specific product work.

More detail: [docs/data-sources.md](/Users/pelayopro/Desktop/floridanomics-dashboard-rewrite/docs/data-sources.md) and [docs/refresh-runbook.md](/Users/pelayopro/Desktop/floridanomics-dashboard-rewrite/docs/refresh-runbook.md).

## Validation

```bash
npm run data:validate
```

The validator now checks both the refreshed core metrics and the richer `v3` product sections, including insight blocks and trade structure.
It also enforces the Florida source stack: FloridaCommerce/SelectFlorida, the Governor's Office, Florida Chamber/Scorecard, Florida TaxWatch, JMI, and Florida Council of 100 / Ambition Accelerated.
It now checks the Florida Brain notes rail as well, including source links for each note.
It also checks the Strategy tab contract: peer states, external benchmark examples, cluster strategy, talent pipeline, and scenario layer.
It also checks the Competition metro-comparison contract: the domestic and international metro peer sets must be present with arrow-based momentum signals.
It also checks the Competition FDI Observatory contract: exactly four scores, peer-state deltas, and source references for every FDI score and delta.

## Deployment

GitHub Pages publishes from the repo with the fixed base path:

- production URL: `https://tonyv2289.github.io/floridanomics-dashboard-mvp/`
- AI Capex Gap brief: `https://tonyv2289.github.io/floridanomics-dashboard-mvp/briefs/ai-capex-gap/`
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
    v3/
      DashboardV3.tsx
      dashboard-v3.css
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

See [docs/v2-roadmap.md](/Users/pelayopro/Desktop/floridanomics-dashboard-rewrite/docs/v2-roadmap.md) for the archived v2 roadmap and shipped rebuild context.
