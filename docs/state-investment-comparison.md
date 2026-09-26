# State investment comparison (Competition > State Comparison)

The State Comparison view shows how Florida compares with nine competitor states (Texas, Georgia, North Carolina,
South Carolina, Tennessee, Alabama, Virginia, Ohio and Arizona) on five measures, plus data-center facts and
documented site-selection contests. The Analysis tab's AI-infrastructure panel reuses the same data-center facts.

## Where the numbers come from

The Florida Brain state investment tracker computes every value from its append-only evidence files and exports two
public-safe files:

- `state-investment-comparison.json`: measures, ranks, reads, caveats and public HTTPS sources (schema version 1).
- `megaprojects-1b-2022-2026.csv`: one row per $1B+ project announced or materially updated from January 2022 to the
  evidence cutoff, each with its primary sources. It is published at `/data/megaprojects-1b-2022-2026.csv` and cited
  by the megaproject measure.

The dashboard does not edit these numbers. Copies of the export live in `scripts/data/`.

## Updating

1. Copy the two exported files into `scripts/data/`.
2. Run `npm run data:state-investment`. It merges the section into `competition.stateInvestment`, merges its sources
   into `competition.sources` by id, copies the CSV into `public/data/`, and runs the publication gate.
3. Run `npm run data:validate`, `npm test` and `npm run build`.

Scheduled refreshes preserve the curated competition layer, so the section persists until the next export.

## Guardrails

- Announced project totals are multi-year commitments, not spending; the megaproject measure excludes data centers
  and LNG terminals and says so.
- Agency-reported totals are not compared across states (their scopes are incompatible).
- Company-wide hyperscaler capital spending is never allocated to states.
- Undisclosed data-center end users are never attributed.
- Every measure, fact and finalists claim must cite a source in `competition.sources`; the publication gate and
  `scripts/validate-data.ts` enforce this.
