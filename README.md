# Floridanomics Dashboard MVP

A standalone Florida-first economic dashboard that makes labor-market strength legible at a glance.

## Product intent
- Florida only (MVP)
- Current position + 1Y/3Y/5Y deltas
- Highlight areas of strength and softness
- Premium executive dashboard feel
- Ready for screenshots, briefings, speeches, and policy/investor discussions

## MVP features
- Hero / executive summary
  - Unemployment rate
  - Labor force
  - Nonfarm payrolls
  - Population
  - Employment level
- Trend cards
  - Current reading
  - 1Y / 3Y / 5Y deltas
  - Compact sparkline
- Statewide trend explorer
  - Metric switcher
  - Full-history context chart
  - Deep-linkable metric state in URL
- Industry section
  - Major Florida sectors
  - Largest growers and laggards
- Metro section
  - Interactive Florida state map with clickable MSA markers
  - URL-deep-linkable metro state
  - Metro-to-metro unemployment comparison chart
  - Miami, Tampa, Orlando, Jacksonville
  - Unemployment, labor force, employment level
- Innovation + Economic Development tab
  - Innovation signal metrics (information jobs, pro/business jobs, business applications, real GSP, construction)
  - Innovation trend explorer with 1Y/3Y/5Y context
  - Rules-based innovation/development narrative
  - Florida Innovation Resource Atlas (statewide + regional resource directory)
- Narrative panel
  - Rules-based plain-English briefing
- Launch utility controls
  - Share current view
  - Download current dataset JSON
  - Data freshness status

## Tech stack
- `React + TypeScript + Vite`
- `Recharts` for visualizations
- `Node + tsx` ingestion scripts
- Static JSON data contract in `public/data/florida-economy.json`

## Quick start
```bash
npm install
npm run data:refresh
npm run dev
```

Production build:
```bash
npm run build
npm run preview
```

## Data refresh
```bash
npm run data:refresh
```

This command:
1. Pulls monthly labor + payroll series from BLS.
2. Pulls annual Florida population (Census-sourced) via FRED series `FLPOP`.
3. Pulls innovation/development indicators via FRED (`BABATOTALSAFL`, `FLRGSP`).
4. Computes latest values and 1Y/3Y/5Y deltas.
5. Writes normalized output to `public/data/florida-economy.json`.

If BLS daily API threshold is hit, refresh falls back to the latest cached BLS series in the existing dataset file so the app remains buildable.

More detail: [docs/data-sources.md](./docs/data-sources.md), [docs/refresh-runbook.md](./docs/refresh-runbook.md).

Validate the dataset contract:
```bash
npm run data:validate
```

Full launch QA pass:
```bash
npm run qa:full
```

## Deployment
This repo includes GitHub Actions workflows for:
- CI (`.github/workflows/ci.yml`)
- GitHub Pages deployment (`.github/workflows/deploy-pages.yml`)
- Scheduled dataset refresh (`.github/workflows/refresh-data.yml`)
- Scheduled security audit (`.github/workflows/security.yml`)

Latest audit notes: [docs/security-audit.md](./docs/security-audit.md)

To publish:
1. In GitHub repo settings, enable Pages and set source to **GitHub Actions**.
2. Push to `main` (or run the `Deploy Dashboard` workflow manually).
3. The dashboard will deploy as a static site with the correct base path.

## Repo structure
```text
floridanomics-dashboard/
  docs/
    data-sources.md
    refresh-runbook.md
    security-audit.md
    v2-roadmap.md
  public/
    data/
      florida-economy.json
  scripts/
    refresh-data.ts
  src/
    components/
      FloridaMsaMap.tsx
    data/
      florida.geo.json
    types/
      dashboard.ts
    App.tsx
    App.css
    index.css
    main.tsx
  package.json
```

## Design direction used
- Deep navy canvas + clean neutral text
- Restrained Florida orange accents
- Sunshine warmth via subtle gradients, no tropical gimmicks
- Strong typographic hierarchy for executive scanability

## v2 roadmap
See [docs/v2-roadmap.md](./docs/v2-roadmap.md).

High-priority v2 themes:
- State comparisons
- More metro/county depth
- Migration, patents, innovation indicators
- Premium intelligence layers
