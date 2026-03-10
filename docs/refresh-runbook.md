# Data Refresh Runbook

## One-command refresh
```bash
npm run data:refresh
```

Outputs:
- `public/data/florida-economy.json`

## What the script computes
- Latest value per metric
- 1-year delta
- 3-year delta
- 5-year delta (where available)
- Sparkline arrays for compact charts
- Industry top growers and laggards
- Rules-based narrative summary
- Innovation tab metrics and innovation resource atlas payload

## Validation checklist
After refresh, quickly verify:
1. File generated successfully in `public/data/`.
2. `asOfLaborMarket` and `asOfPopulation` are current.
3. Metro section includes all four metros.
4. No missing values in hero metrics.

## Local QA
```bash
npm run lint
npm run build
npm run dev
```

Launch-ready combined check:
```bash
npm run qa:full
```

## Operational notes
- BLS request chunking is built in for API reliability.
- If BLS daily quota is exhausted, refresh automatically reuses cached BLS series from the existing dataset.
- If a series is unavailable, the script fails fast with a clear message.
- Dataset contract is typed in `src/types/dashboard.ts`.
