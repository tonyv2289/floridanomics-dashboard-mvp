# Data Refresh Runbook

## One-command refresh

```bash
npm run data:refresh
```

Output:

- `public/data/florida-economy.json`

## What the refresh now does

### Rebuilds the dynamic core

- latest statewide labor readings
- 1Y / 3Y / 5Y deltas
- industry growth and laggards
- metro snapshots
- peer-state BLS benchmarks for the Strategy tab
- innovation metrics
- generated statewide and innovation narratives

### Preserves the curated product sections

- `scorecard2030`
- `brainNotes`
- `strategy` curated copy, benchmark examples, clusters, talent pipeline, and scenarios
- `distinctives`
- `trade`
- existing curated source links

This is the critical guardrail for the current product. The differentiated Florida-specific sections should not disappear during a routine metric refresh.

## Preconditions

- Keep `public/data/florida-economy.json` in the repo before running refresh
- If you have somehow removed the dataset file, restore it from git first

The refresh script uses the existing dataset as the curated base and then layers fresh metric data on top.

## Validation checklist

After refresh, verify:

1. `generatedAt`, `asOfLaborMarket`, and `asOfPopulation` updated correctly
2. core metrics and metro series still render
3. `scorecard2030`, `brainNotes`, `strategy`, `distinctives`, and `trade` still exist in the dataset
4. source links remain present on the curated sections
5. `strategy.peerStates` includes FL, TX, GA, NC, TN, AZ, UT, and CA

## Validation commands

```bash
npm run data:validate
npm run lint
npm run build
```

Launch-ready combined check:

```bash
npm run qa:full
```

## When you are editing curated sections

If you need to change:

- source notes
- Florida Brain notes
- Strategy tab copy and source models
- verified stat copy
- Florida-specific section framing
- trade release framing

edit `public/data/florida-economy.json` intentionally, then run:

```bash
npm run data:validate
```

## Operational notes

- BLS request chunking and retry logic are built in
- If the BLS daily threshold is exhausted, refresh falls back to cached BLS series from the existing dataset
- The validator now checks the full v3 product contract, not just the older MVP metric shell
