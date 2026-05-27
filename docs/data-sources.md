# Data Sources

Floridanomics now uses a two-layer source model: refreshed core metrics plus curated verified Florida-specific sections.

## 1. Refreshed core metrics

These are programmatically refreshed by `npm run data:refresh`.

### Bureau of Labor Statistics

Primary source for statewide labor market, payroll, industry, and metro metrics. Statewide household-series headlines use the seasonally adjusted `LASST` series so the dashboard matches the official monthly state release.

- API: `https://www.bls.gov/developers/`
- Endpoint: `POST https://api.bls.gov/publicAPI/v2/timeseries/data/`

### Florida statewide core series

- Unemployment rate: `LASST120000000000003`
- Labor force: `LASST120000000000006`
- Employment level: `LASST120000000000005`
- Nonfarm payrolls: `SMS12000000000000001`

### Peer-state strategy benchmarks

The `Strategy` tab adds a live BLS peer-state layer for Florida and the states it should be benchmarked against: Texas, Georgia, North Carolina, Tennessee, Arizona, Utah, and California.

For each peer state, the refresh script pulls:

- unemployment rate: `LASST{state_fips}0000000000003`
- labor force: `LASST{state_fips}0000000000006`
- nonfarm payrolls: `SMS{state_fips}000000000000001`

Current peer set:

- Florida: `12`
- Texas: `48`
- Georgia: `13`
- North Carolina: `37`
- Tennessee: `47`
- Arizona: `04`
- Utah: `49`
- California: `06`

### Industry employment

- Construction: `SMS12000002000000001`
- Manufacturing: `SMS12000003000000001`
- Trade, Transportation, Utilities: `SMS12000004000000001`
- Information: `SMS12000005000000001`
- Financial Activities: `SMS12000005500000001`
- Professional & Business Services: `SMS12000006000000001`
- Private Education & Health Services: `SMS12000006500000001`
- Leisure & Hospitality: `SMS12000007000000001`
- Other Services: `SMS12000008000000001`
- Government: `SMS12000009000000001`

### Metro snapshots

Each metro uses unemployment (`003`), employment (`005`), and labor force (`006`) LAUS series.

- Miami MSA root: `LAUMT123310000000`
- Tampa MSA root: `LAUMT124530000000`
- Orlando MSA root: `LAUMT123674000000`
- Jacksonville MSA root: `LAUMT122726000000`

### Population anchor

Population is pulled from FRED series `FLPOP`, whose source notes cite U.S. Census Bureau resident population estimates.

- Series: `https://fred.stlouisfed.org/series/FLPOP`

### Innovation indicators via FRED

- Business Applications (Florida, SA): `BABATOTALSAFL`
- Real Gross State Product (Florida): `FLRGSP`

## 2. Curated verified sections

These are intentionally maintained as curated product sections inside the dataset and preserved across refreshes.

### `scorecard2030`

Primary sources:

- Florida Scorecard
- Florida Chamber Foundation wealth migration release
- World Bank GDP API

### `distinctives.snowbirdIndex`

Primary sources:

- Florida Chamber Foundation
- Florida Scorecard county and statewide migration / population views

### `distinctives.spaceCoastCadence`

Primary sources:

- Space Florida
- Florida governor announcement on Blue Origin

### `distinctives.latamGateway`

Primary sources:

- PortMiami
- PortMiami overall statistics PDF
- Port Everglades

### `trade`

Primary sources:

- FloridaCommerce / SelectFlorida / official release stack already embedded in the dataset

### `brainNotes`

Primary sources:

- BLS April 2026 state release for the AI Capex Gap labor-market frame
- Florida Governor's Office SB 484 release for the ratepayer and data-center policy posture
- CBRE and JLL data-center research for the strategic compute market context

### `strategy`

The Strategy tab combines refreshed peer-state BLS benchmarks with curated strategy modules from the state-dashboard comparison analysis.

Primary benchmark examples:

- Texas Comptroller TexStats
- Texas 2036 Data Hub
- Pennsylvania On Target
- North Carolina County Economic Vitality Dashboard
- Tennessee Education to Employment Dashboard
- Washington STEM Talent Supply and Demand Dashboard
- Massachusetts Competitiveness Index

Product modules:

- peer-state benchmark table
- cluster strategy view
- talent pipeline source model
- metro momentum layer
- base / ambition / risk scenario layer

## 3. Florida policy and strategy source layer

V3 keeps a named Florida source layer in the public dataset so the dashboard can keep moving toward a Florida Brain research terminal without losing provenance. These sources are not all monthly numeric feeds yet; some are validated strategy, policy, or announcement sources used for editorial context and future modules.

Required source stack:

- FloridaCommerce and SelectFlorida for state commerce, trade, workforce, and business expansion signals
- Florida Governor's Office for official executive announcements on capital investment and project wins
- Florida Chamber Foundation and Florida Scorecard for 2030 trajectory, FutureCast, income migration, and business competitiveness metrics
- Florida TaxWatch for independent fiscal, taxpayer, economic, and budget policy research
- The James Madison Institute for Florida policy research on economic freedom, regulatory climate, workforce, housing, education, and competitiveness
- Florida Council of 100 / Ambition Accelerated for business-led competitiveness strategy and the Gold Coast growth platform

Strategy source stack:

- Texas Comptroller TexStats for official state dashboard discipline
- Texas 2036 for state-futures and scenario framing
- Pennsylvania On Target for cluster strategy
- North Carolina EVI for county momentum
- Tennessee E2E for education-to-employment outcomes
- Washington STEM for talent supply-demand
- Massachusetts Competitiveness Index for peer-state competitiveness framing

`npm run data:validate` now fails if the required Florida source stack is missing from either the public source footer or the innovation source atlas. It also fails if the Strategy source stack, peer-state layer, cluster layer, talent pipeline, or scenarios are missing.

## 4. Source layering model

The key product rule is:

- **dynamic labor and innovation metrics are refreshed**
- **curated differentiated sections are preserved**

This avoids the old failure mode where a routine data refresh could erase Florida-specific editorial work.

## 5. Caveats

- Labor metrics are monthly, population is annual
- Some trade and Florida-specific sections are updated on their own release cadence, not monthly
- Several v3 sections are verified and curated rather than programmatically scraped
- `Snowbird Index` is still a proxy build pending a bespoke seasonal migration series
