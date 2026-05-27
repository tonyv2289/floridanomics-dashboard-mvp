# V2 Roadmap

## Current status

The current draft is no longer a thin MVP. It already ships the major architectural shift:

- `v2` as the launch-default dashboard
- preserved `v1` compare path
- lead-story layout instead of a flat hero grid
- interpretation copy under live charts and signal cards
- Florida-specific blocks for `2030 Trajectory`, `Snowbird Index`, `Space Coast Cadence`, and `LATAM Gateway`
- Open Graph and Twitter share previews

## Highest-priority next moves

## 1. Replace the Snowbird proxy with the real seasonal series

- Build the bespoke Q4/Q1 migration series
- Break out NY / CA / IL inflow where possible
- Remove the current proxy label once the real series is live

## 2. Connect the dashboard more directly to the Floridanomics engine

- Feed lead-story candidates from the daily engine
- Reuse verified editorial interpretations where the engine has better language
- Add freshness and source provenance that reflects both static and engine-fed sections

## 3. Add comparator-state context without losing the Florida-first frame

- Texas
- North Carolina
- Georgia
- Tennessee
- Arizona

The right implementation is selective, not a giant national rankings page.

## 4. Expand county and corridor depth

- county snapshots for growth corridors
- more metro coverage beyond the top four
- corridor views for Space Coast, I-4, Gold Coast, and Jacksonville logistics

## 5. Extract curated sections into their own maintainable source

The current refresh flow now preserves curated `v2` sections correctly, but a cleaner long-term state is:

- scripted dynamic metrics in one source
- curated verified product sections in one source
- merged output for the app

## 6. Productization

- saved views / shareable brief links
- export mode for PDF or static briefing pages
- change log / release notes
- optional gated premium intelligence layers later, not before the core product is stable
