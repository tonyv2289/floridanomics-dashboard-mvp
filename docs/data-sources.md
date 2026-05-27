# Data Sources

Floridanomics now uses a two-layer source model: refreshed core metrics plus curated verified Florida-specific sections.

## 1. Refreshed core metrics

These are programmatically refreshed by `npm run data:refresh`.

### Bureau of Labor Statistics

Primary source for statewide labor market, payroll, industry, and metro metrics.

- API: `https://www.bls.gov/developers/`
- Endpoint: `POST https://api.bls.gov/publicAPI/v2/timeseries/data/`

### Florida statewide core series

- Unemployment rate: `LAUST120000000000003`
- Labor force: `LAUST120000000000006`
- Employment level: `LAUST120000000000005`
- Nonfarm payrolls: `SMS12000000000000001`

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

## 3. Source layering model

The key product rule is:

- **dynamic labor and innovation metrics are refreshed**
- **curated differentiated sections are preserved**

This avoids the old failure mode where a routine data refresh could erase Florida-specific editorial work.

## 4. Caveats

- Labor metrics are monthly, population is annual
- Some trade and Florida-specific sections are updated on their own release cadence, not monthly
- Several `v2` sections are verified and curated rather than programmatically scraped
- `Snowbird Index` is still a proxy build pending a bespoke seasonal migration series
