# Data Sources

## 1) Bureau of Labor Statistics (BLS)
Primary source for labor market and payroll metrics.

- API: https://www.bls.gov/developers/
- Endpoint: `POST https://api.bls.gov/publicAPI/v2/timeseries/data/`

### Florida statewide core metrics
- Unemployment rate: `LAUST120000000000003`
- Labor force: `LAUST120000000000006`
- Employment level: `LAUST120000000000005`
- Nonfarm payrolls: `SMS12000000000000001`

### Florida industry employment (major sectors)
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

### Metro snapshots (LAUS)
Each metro uses unemployment rate (`003`), employment (`005`), and labor force (`006`).

- Miami MSA root: `LAUMT123310000000`
- Tampa MSA root: `LAUMT124530000000`
- Orlando MSA root: `LAUMT123674000000`
- Jacksonville MSA root: `LAUMT122726000000`

## 2) Population anchor (Census-sourced)
Population is pulled from FRED series `FLPOP`, whose source notes cite U.S. Census Bureau resident population estimates.

- Series: https://fred.stlouisfed.org/series/FLPOP
- CSV endpoint used: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=FLPOP`

## Why this source mix
- BLS gives high-confidence, frequently updated labor and payroll data.
- Population is annual and stable; `FLPOP` is simple to fetch and reproducible while staying Census-sourced.

## Map geometry source
- Florida shape in `src/data/florida.geo.json` is derived from the `us-atlas` public TopoJSON dataset.
- This is a frontend geometry asset only; economic metrics still come from BLS/Census-sourced feeds above.

## Caveats
- Labor metrics are monthly, population is annual.
- BLS public API has per-request series limits; ingestion script chunks requests to avoid dropped series.
