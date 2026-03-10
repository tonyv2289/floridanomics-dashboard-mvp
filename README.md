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
- Industry section
  - Major Florida sectors
  - Largest growers and laggards
- Metro section
  - Miami, Tampa, Orlando, Jacksonville
  - Unemployment, labor force, employment level
- Narrative panel
  - Rules-based plain-English briefing

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
3. Computes latest values and 1Y/3Y/5Y deltas.
4. Writes normalized output to `public/data/florida-economy.json`.

More detail: [docs/data-sources.md](./docs/data-sources.md), [docs/refresh-runbook.md](./docs/refresh-runbook.md).

## Repo structure
```text
floridanomics-dashboard/
  docs/
    data-sources.md
    refresh-runbook.md
    v2-roadmap.md
  public/
    data/
      florida-economy.json
  scripts/
    refresh-data.ts
  src/
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
