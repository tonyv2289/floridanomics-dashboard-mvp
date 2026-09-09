# Floridanomics Dashboard

Florida Brain's public data surface for Florida economic, innovation, and trade intelligence.

## Current product state

`v3` is the live dashboard, served at the root route. (Earlier v1/v2 prototypes have been retired; there are no compare routes.)

The executive navigation is built around four jobs:

1. `Today`: what changed, why it matters, what to watch, and the decision implication
2. `Competition`: project capex, government awards, metros, and FDI
3. `Policy`: live policy watch and decision memos
4. `Evidence`: metric vintages, release calendar, source classes, methodology, and corrections

Specialist drill-downs remain available for Lenses, Strategy, Talent, Terminal, Scorecard, Innovation, and Trade.

`Competition` is the operating menu for:

- `US Metros`: South Florida, Tampa, Orlando, Jacksonville, Austin, Seattle, Boston, Chicago, and Nashville
- `International Metros`: Miami vs Dubai, Riyadh, Taipei, and Singapore
- `Strategy`: peers, clusters, scenarios
- `FDI`: publicly sourced investment flows, employment, and greenfield share

It also includes the newer editorial and Florida-specific sections that make the product more than a generic KPI board:

- `2030 Trajectory`
- `Snowbird Index` proxy
- `Space Coast Cadence`
- `LATAM Gateway`
- Florida Brain Notes
- Strategy cockpit with peer-state BLS benchmarks, cluster strategy, talent pipeline, metro momentum, and scenarios
- Talent Match with occupational demand, covered public-university bachelor's outcomes, institution leaders, and named project pressure
- State competition terminal with metro comparisons, editorial FDI flow/quality scores, peer-state FDI deltas, and federal data spine layers
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

`public/data/florida-economy.json` is a merged product dataset with three layers:

1. **Refreshed core metrics**
   - BLS labor market and payroll data
   - Census-sourced population via FRED `FLPOP`
   - FRED business applications and real GSP indicators
   - Federal feed-status layer for BLS, Census, BEA, EIA, and IRS

2. **Curated verified sections**
   - `scorecard2030`
   - `brainNotes`
   - `strategy`
   - `talent`
   - `competition`
   - `federal`
   - `terminal`
   - `distinctives.snowbirdIndex`
   - `distinctives.spaceCoastCadence`
   - `distinctives.latamGateway`
   - `trade`

3. **Trust contract**
   - headline metric observation and release vintages
   - next expected release dates
   - revision status
   - source classifications
   - methodology and corrections policy

`npm run data:refresh` updates the dynamic labor, population, metro, industry, innovation, and peer-state benchmark metrics while preserving the curated sections, Florida Brain notes, and source links. That is intentional so a routine refresh cannot wipe the differentiated Florida-specific product work.

More detail: [docs/data-sources.md](docs/data-sources.md) and [docs/refresh-runbook.md](docs/refresh-runbook.md).

## Validation

```bash
npm run data:validate
```

The validator now checks both the refreshed core metrics and the richer `v3` product sections, including the trust contract, source classifications, insight blocks, and trade structure.
It also enforces the Florida source stack: FloridaCommerce/SelectFlorida, the Governor's Office, Florida Chamber/Scorecard, Florida TaxWatch, JMI, and Florida Council of 100 / Ambition Accelerated.
It now checks the Florida Brain notes rail as well, including source links for each note.
It also checks the Strategy tab contract: peer states, external benchmark examples, cluster strategy, talent pipeline, and scenario layer.
It checks the Talent Match contract as well: seven required pathways, source references, CIP/SOC identifiers, demand and outcome ranges, institution leaders, and valid project-ledger links.
It also checks the Competition metro-comparison contract: the domestic and international metro peer sets must be present with arrow-based momentum signals.
It also checks the Competition FDI Observatory contract: two public-source editorial scores, peer-state deltas, and source references for every FDI score and delta.

### Public/private publication boundary

Only public evidence belongs in this repository, including its source history. The competition source contract contains only `id`, `label`, `url`, and a public explanatory `note`. Every published comparison must resolve to an approved public HTTPS citation. Do not substitute a generic public URL for a private document that actually supports a claim.

Private-only research comparisons are withheld pending independent public-source verification; they must not be restored by a routine data refresh. Backups and provenance remain outside this repository. Historical BEA figures retain their labeled vintage and are not presented as the latest estimates.

Refresh and data validation reject private metadata keys, local filesystem paths, and known private-source markers. Every build scans `public` before compilation and `dist` afterward, blocking those markers, credential/configuration files, symlinks, and source maps. These targeted regression checks supplement human source review and secret scanning; they cannot classify every possible confidential sentence. Keep the guards in place when extending the schema.

Removing a file from the latest release does not remove old Git commits, cached copies, forks, or downloads. Any history rewrite, repository-visibility change, or DNS migration requires a separate reviewed recovery plan.

## Deployment

GitHub Pages publishes from the repo with the fixed base path:

- production URL: `https://www.floridanomics.com/`
- AI Capex Gap brief: `https://www.floridanomics.com/briefs/ai-capex-gap/`
- social preview image: `public/og-image.png`

Push a `codex/**` branch and wait for CI (`quality`) and Security Audit (`dependency-audit`) before merging or fast-forwarding `main`. Both checks are required by branch protection, including for administrators. Publishing from `main` also reruns the dependency audits, lint, tests, and data validation before uploading an artifact. Manual deploys from other branches are skipped. The deployment accepts repository variables `VITE_BASE_PATH` and `VITE_PUBLIC_URL`.

Approved data/policy refreshes now stage a `codex/**` branch and explicitly dispatch its checks. Review that branch and merge after checks pass; refresh jobs cannot bypass production protection. Dependabot proposes dependency and pinned-action updates weekly, and automated security fixes are enabled.

## Analytics

Analytics are wired but off by default. Add one or both GitHub Actions secrets to turn them on at deploy time:

- `VITE_GA_MEASUREMENT_ID`: GA4 Measurement ID, for example `G-XXXXXXXXXX`
- `VITE_PLAUSIBLE_DOMAIN`: Plausible site domain, for example `tonyv2289.github.io`
- `VITE_PLAUSIBLE_SRC`: optional script URL; the Content Security Policy permits only the approved `plausible.io` host (review the policy before using a custom host).

The tracker records dashboard pageviews, explicit tab/view events, outbound source domains, and non-personal campaign slugs from only these query keys:

`utm_source`, `utm_medium`, and `utm_campaign` (letters, numbers, hyphens and underscores; maximum 48 characters). Do not put names, emails or per-recipient identifiers into campaign slugs. Page URLs and referrers have credentials, query strings and fragments removed; outbound click URLs contain only the destination origin.

For email sharing, use campaign links such as:

```text
https://www.floridanomics.com/?view=atlas&utm_source=outlook&utm_medium=email&utm_campaign=atlas_launch
```

Invite/ref tokens and free-text query fields are intentionally not collected. Keep named follow-up in private systems. Before enabling GA4, disable automatic enhanced-measurement collection in the property and verify the actual network payloads; this app supplies its own sanitized events. Analytics remains off until explicitly configured.

The briefing signup posts directly to the Floridanomics Substack subscription endpoint. No email address is stored by this repository.

## Executive beta

The launch beta runs across the August 21, September 18, and October 16, 2026 Florida labor releases. See [docs/executive-beta.md](docs/executive-beta.md) for the operating gate, measures, and interview protocol. The private named cohort and feedback log live in Pelayo Vault.

## Repo structure

```text
floridanomics-dashboard-rewrite/
  docs/
    data-sources.md
    executive-beta.md
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

Bound by [DESIGN.md](DESIGN.md):

- deep navy primary surface
- Sora + Manrope
- Florida Sun as the only non-data accent
- editorial hierarchy over startup-template UI
- no purple, no gradient slop, no icons-in-circles

## What comes next

See [docs/v2-roadmap.md](docs/v2-roadmap.md) for the archived v2 roadmap and shipped rebuild context.
