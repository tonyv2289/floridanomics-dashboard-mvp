import type {
  DashboardDataset,
  FederalDataLayer,
  FederalSignal,
  FederalSource,
  InnovationMetricId,
  Metric,
  PeerStateSnapshot,
  TradeSection,
} from "../src/types/dashboard";

type BuildFederalDataLayerInput = {
  refreshedAt: string;
  metrics: DashboardDataset["metrics"];
  innovationMetrics: Record<InnovationMetricId, Metric>;
  peerStates: PeerStateSnapshot[];
  trade: TradeSection;
};

type CensusTable = string[][];

type EiaRetailSalesResponse = {
  response?: {
    data?: Array<{
      period?: string;
      stateid?: string;
      stateDescription?: string;
      price?: number | string;
      "price-units"?: string;
    }>;
  };
};

type BeaRegionalResponse = {
  BEAAPI?: {
    Results?: {
      Error?: {
        APIErrorCode?: string;
        APIErrorDescription?: string;
      };
      Data?: Array<{
        TimePeriod?: string;
        DataValue?: string;
        CL_UNIT?: string;
      }>;
    };
  };
};

const FEDERAL_SOURCE_URLS = {
  bls: "https://www.bls.gov/developers/api_signature_v2.htm",
  censusBfs: "https://www.census.gov/econ/bfs/index.html",
  censusTrade: "https://api.census.gov/data/timeseries/intltrade/exports/statehsexport.html",
  beaRegional: "https://www.bea.gov/data/gdp/gdp-state",
  eiaElectricity: "https://www.eia.gov/opendata/documentation.php",
  irsMigration: "https://www.irs.gov/statistics/soi-tax-stats-migration-data",
} as const;

function hasEnvKey(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function formatCompact(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits,
  }).format(value);
}

function formatCurrencyBillions(value: number): string {
  return `$${(value / 1_000_000_000).toFixed(1)}B`;
}

function formatThousandsJobs(value: number): string {
  return `${formatCompact(value * 1000, 1)} jobs`;
}

function dateToMonth(date: string): string {
  return date.slice(0, 7);
}

function parseTradeYear(trade: TradeSection): string {
  const match = `${trade.asOf} ${trade.headline}`.match(/20\d{2}/);
  return match?.[0] ?? String(new Date().getUTCFullYear() - 1);
}

function buildSources(): FederalSource[] {
  const hasCensusKey = hasEnvKey("CENSUS_API_KEY");
  const hasBeaKey = hasEnvKey("BEA_API_KEY");
  const hasEiaKey = hasEnvKey("EIA_API_KEY");

  return [
    {
      id: "bls_public_api",
      agency: "U.S. Bureau of Labor Statistics",
      label: "BLS Public Data API",
      tier: "federal_api",
      url: FEDERAL_SOURCE_URLS.bls,
      apiUrl: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      envKey: "BLS_API_KEY",
      status: "live",
      note: "Live LAUS and CES labor-market backbone. Key is optional but raises BLS request limits.",
    },
    {
      id: "census_bfs_api",
      agency: "U.S. Census Bureau",
      label: "Business Formation Statistics API",
      tier: "federal_api",
      url: FEDERAL_SOURCE_URLS.censusBfs,
      apiUrl: "https://api.census.gov/data/timeseries/eits/bfs",
      envKey: "CENSUS_API_KEY",
      status: hasCensusKey ? "live" : "needs_key",
      note: "Direct source for business applications. Until the key is configured, the dashboard uses the same Census series via FRED.",
    },
    {
      id: "census_state_exports_api",
      agency: "U.S. Census Bureau",
      label: "State export API",
      tier: "federal_api",
      url: FEDERAL_SOURCE_URLS.censusTrade,
      apiUrl: "https://api.census.gov/data/timeseries/intltrade/exports/statehsexport",
      envKey: "CENSUS_API_KEY",
      status: hasCensusKey ? "live" : "needs_key",
      note: "Direct source for state exports by month. Until the key is configured, the dashboard keeps the verified SelectFlorida trade release.",
    },
    {
      id: "bea_regional_api",
      agency: "U.S. Bureau of Economic Analysis",
      label: "BEA Regional API",
      tier: "federal_api",
      url: FEDERAL_SOURCE_URLS.beaRegional,
      apiUrl: "https://apps.bea.gov/api/data/",
      envKey: "BEA_API_KEY",
      status: hasBeaKey ? "live" : "needs_key",
      note: "Direct source for state GDP and income accounts. Falls back to the BEA/FRED bridge when the key is unavailable.",
    },
    {
      id: "eia_electricity_api",
      agency: "U.S. Energy Information Administration",
      label: "EIA Open Data API",
      tier: "federal_api",
      url: FEDERAL_SOURCE_URLS.eiaElectricity,
      apiUrl: "https://api.eia.gov/v2/electricity/retail-sales/data/",
      envKey: "EIA_API_KEY",
      status: hasEiaKey ? "live" : "needs_key",
      note: "Direct source for electricity price, sales, and power-readiness proxies tied to data-center competitiveness.",
    },
    {
      id: "irs_soi_migration_download",
      agency: "Internal Revenue Service",
      label: "IRS SOI Migration Data",
      tier: "federal_download",
      url: FEDERAL_SOURCE_URLS.irsMigration,
      status: "download_required",
      note: "Official migration and AGI flow data. IRS publishes downloadable files rather than a stable JSON API.",
    },
  ];
}

function tableRecord(table: CensusTable): Record<string, string> | null {
  const [headers, firstRow] = table;
  if (!headers || !firstRow) {
    return null;
  }

  return Object.fromEntries(headers.map((header, index) => [header, firstRow[index] ?? ""]));
}

async function fetchCensusBusinessApplications(
  period: string,
): Promise<{ value: number; period: string; url: string } | null> {
  const key = process.env.CENSUS_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const url = new URL("https://api.census.gov/data/timeseries/eits/bfs");
  url.searchParams.set("get", "NAME,BA_BA");
  url.searchParams.set("for", "state:12");
  url.searchParams.set("time", period);
  url.searchParams.set("key", key);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Census BFS request failed with HTTP ${response.status}`);
  }

  const record = tableRecord((await response.json()) as CensusTable);
  const value = Number(record?.BA_BA);
  if (!Number.isFinite(value)) {
    throw new Error("Census BFS response did not include a numeric BA_BA value.");
  }

  return { value, period, url: FEDERAL_SOURCE_URLS.censusBfs };
}

async function fetchCensusStateExports(
  tradeYear: string,
): Promise<{ valueUsd: number; period: string; url: string } | null> {
  const key = process.env.CENSUS_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const url = new URL("https://api.census.gov/data/timeseries/intltrade/exports/statehsexport");
  url.searchParams.set("get", "STATE,ALL_VAL_YR");
  url.searchParams.set("STATE", "12");
  url.searchParams.set("YEAR", tradeYear);
  url.searchParams.set("MONTH", "12");
  url.searchParams.set("key", key);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Census state export request failed with HTTP ${response.status}`);
  }

  const record = tableRecord((await response.json()) as CensusTable);
  const valueUsd = Number(record?.ALL_VAL_YR);
  if (!Number.isFinite(valueUsd)) {
    throw new Error("Census state export response did not include a numeric ALL_VAL_YR value.");
  }

  return { valueUsd, period: tradeYear, url: FEDERAL_SOURCE_URLS.censusTrade };
}

function parseBeaNumber(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }

  return Number.parseFloat(value.replace(/,/g, ""));
}

async function fetchBeaRealGsp(): Promise<{
  valueMillions: number;
  unit: string;
  period: string;
  url: string;
} | null> {
  const key = process.env.BEA_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const url = new URL("https://apps.bea.gov/api/data/");
  url.searchParams.set("UserID", key);
  url.searchParams.set("method", "GETDATA");
  url.searchParams.set("datasetname", "Regional");
  url.searchParams.set("TableName", "SAGDP9");
  url.searchParams.set("LineCode", "1");
  url.searchParams.set("GeoFips", "12000");
  url.searchParams.set("Year", "LAST10");
  url.searchParams.set("ResultFormat", "JSON");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BEA Regional request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as BeaRegionalResponse;
  const apiError = payload.BEAAPI?.Results?.Error;
  if (apiError) {
    throw new Error(`BEA Regional request unsuccessful: ${apiError.APIErrorDescription ?? apiError.APIErrorCode}`);
  }

  const latest = (payload.BEAAPI?.Results?.Data ?? [])
    .map((row) => ({
      period: row.TimePeriod ?? "",
      valueMillions: parseBeaNumber(row.DataValue),
      unit: row.CL_UNIT ?? "Millions of chained 2017 dollars",
    }))
    .filter((row) => /^\d{4}$/.test(row.period) && Number.isFinite(row.valueMillions))
    .sort((a, b) => Number.parseInt(b.period, 10) - Number.parseInt(a.period, 10))[0];

  if (!latest) {
    throw new Error("BEA Regional response did not include a numeric Florida real GSP value.");
  }

  return {
    ...latest,
    url: FEDERAL_SOURCE_URLS.beaRegional,
  };
}

async function fetchEiaIndustrialElectricityPrice(): Promise<{
  value: number;
  unit: string;
  period: string;
  url: string;
} | null> {
  const key = process.env.EIA_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const url = new URL("https://api.eia.gov/v2/electricity/retail-sales/data/");
  url.searchParams.set("api_key", key);
  url.searchParams.set("frequency", "monthly");
  url.searchParams.set("data[0]", "price");
  url.searchParams.set("facets[stateid][]", "FL");
  url.searchParams.set("facets[sectorid][]", "IND");
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", "1");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`EIA electricity request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as EiaRetailSalesResponse;
  const row = payload.response?.data?.[0];
  const value = Number(row?.price);
  if (!row?.period || !Number.isFinite(value)) {
    throw new Error("EIA electricity response did not include a latest industrial price.");
  }

  return {
    value,
    unit: row["price-units"] ?? "cents per kilowatthour",
    period: row.period,
    url: FEDERAL_SOURCE_URLS.eiaElectricity,
  };
}

async function safeOptionalSignal<T>(fetcher: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fetcher();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Optional federal feed failed: ${message}`);
    return null;
  }
}

function signal(input: Omit<FederalSignal, "retrievedAt">, refreshedAt: string): FederalSignal {
  return {
    ...input,
    retrievedAt: refreshedAt,
  };
}

export async function buildFederalDataLayer(input: BuildFederalDataLayerInput): Promise<FederalDataLayer> {
  const sources = buildSources();
  const missingKeys = Array.from(
    new Set(sources.flatMap((source) => (source.envKey && source.status === "needs_key" ? [source.envKey] : []))),
  );
  const refreshedAt = input.refreshedAt;
  const businessApplications = input.innovationMetrics.businessApplications.latest;
  const realGsp = input.innovationMetrics.realGsp.latest;
  const tradeYear = parseTradeYear(input.trade);
  const tradeHero = input.trade.heroMetrics.find((metric) => metric.id === "totalExports");
  const censusBusinessApps = await safeOptionalSignal(() => fetchCensusBusinessApplications(dateToMonth(businessApplications.date)));
  const censusExports = await safeOptionalSignal(() => fetchCensusStateExports(tradeYear));
  const beaRealGsp = await safeOptionalSignal(fetchBeaRealGsp);
  const eiaIndustrialPrice = await safeOptionalSignal(fetchEiaIndustrialElectricityPrice);
  const fastestPayrollPeer = [...input.peerStates].sort((a, b) => {
    const aDelta = a.nonfarmPayrolls.deltas.oneYear?.percent ?? Number.NEGATIVE_INFINITY;
    const bDelta = b.nonfarmPayrolls.deltas.oneYear?.percent ?? Number.NEGATIVE_INFINITY;
    return bDelta - aDelta;
  })[0];

  const signals: FederalSignal[] = [
    signal(
      {
        id: "bls-florida-unemployment",
        label: "Florida unemployment",
        value: `${input.metrics.unemploymentRate.latest.value.toFixed(1)}%`,
        unit: "percent",
        geography: "Florida",
        period: input.metrics.unemploymentRate.latest.date,
        sourceId: "bls_public_api",
        status: "live",
        read: "The labor-market cockpit is already on live BLS LAUS data.",
        sourceUrl: FEDERAL_SOURCE_URLS.bls,
      },
      refreshedAt,
    ),
    signal(
      {
        id: "bls-florida-nonfarm-payrolls",
        label: "Florida nonfarm payrolls",
        value: formatThousandsJobs(input.metrics.nonfarmPayrolls.latest.value),
        unit: "jobs",
        geography: "Florida",
        period: input.metrics.nonfarmPayrolls.latest.date,
        sourceId: "bls_public_api",
        status: "live",
        read: "Payrolls are live from BLS CES, which is the right monthly benchmark for jobs by employer.",
        sourceUrl: FEDERAL_SOURCE_URLS.bls,
      },
      refreshedAt,
    ),
    signal(
      {
        id: "bls-peer-payroll-leader",
        label: "Peer payroll leader",
        value: fastestPayrollPeer
          ? `${fastestPayrollPeer.shortName} ${((fastestPayrollPeer.nonfarmPayrolls.deltas.oneYear?.percent ?? 0)).toFixed(1)}% YoY`
          : "n/a",
        unit: "year-over-year percent",
        geography: "Peer states",
        period: fastestPayrollPeer?.nonfarmPayrolls.latest.date ?? input.metrics.nonfarmPayrolls.latest.date,
        sourceId: "bls_public_api",
        status: "live",
        read: "The competitor tab already compares Florida against peers on the same federal labor-series footing.",
        sourceUrl: FEDERAL_SOURCE_URLS.bls,
      },
      refreshedAt,
    ),
    signal(
      {
        id: "census-business-applications",
        label: "Business applications",
        value: (censusBusinessApps?.value ?? businessApplications.value).toLocaleString(),
        unit: "applications",
        geography: "Florida",
        period: censusBusinessApps?.period ?? businessApplications.date,
        sourceId: "census_bfs_api",
        status: censusBusinessApps ? "live" : "fallback",
        read: censusBusinessApps
          ? "Business formation is now coming straight from the Census BFS API."
          : "Business formation is federal data, but this build still uses the Census BFS series through FRED until CENSUS_API_KEY is configured.",
        sourceUrl: censusBusinessApps?.url ?? FEDERAL_SOURCE_URLS.censusBfs,
        caveat: censusBusinessApps ? undefined : "Set CENSUS_API_KEY to replace the FRED bridge with direct Census API calls.",
      },
      refreshedAt,
    ),
    signal(
      {
        id: "census-florida-exports",
        label: "Florida exports",
        value:
          censusExports?.valueUsd !== undefined
            ? formatCurrencyBillions(censusExports.valueUsd)
            : tradeHero
              ? `$${tradeHero.value.toFixed(1)}B`
              : "Needs Census key",
        unit: "current dollars",
        geography: "Florida",
        period: censusExports?.period ?? input.trade.asOf,
        sourceId: "census_state_exports_api",
        status: censusExports ? "live" : "fallback",
        read: censusExports
          ? "The trade layer can now reconcile the SelectFlorida release against the Census state export API."
          : "Trade is still sourced from the verified SelectFlorida release; direct Census export reconciliation turns on with CENSUS_API_KEY.",
        sourceUrl: censusExports?.url ?? FEDERAL_SOURCE_URLS.censusTrade,
        caveat: censusExports ? undefined : "Set CENSUS_API_KEY for direct monthly state export calls.",
      },
      refreshedAt,
    ),
    signal(
      {
        id: "bea-real-gsp",
        label: "Real gross state product",
        value: `$${formatCompact((beaRealGsp?.valueMillions ?? realGsp.value) * 1_000_000, 1)}`,
        unit: "chained dollars",
        geography: "Florida",
        period: beaRealGsp?.period ?? realGsp.date,
        sourceId: "bea_regional_api",
        status: beaRealGsp ? "live" : hasEnvKey("BEA_API_KEY") ? "fallback" : "needs_key",
        read: beaRealGsp
          ? "Real GSP is now coming straight from the BEA Regional API, table SAGDP9, line 1, Florida."
          : "GSP is currently the BEA state series through FRED. The BEA key activates direct regional-account pulls.",
        sourceUrl: beaRealGsp?.url ?? FEDERAL_SOURCE_URLS.beaRegional,
        caveat: beaRealGsp
          ? undefined
          : hasEnvKey("BEA_API_KEY")
            ? "Direct BEA call failed during refresh, so this build is using the FRED bridge."
            : "Configure BEA_API_KEY before replacing the FRED bridge with direct BEA Regional API calls.",
      },
      refreshedAt,
    ),
    signal(
      {
        id: "eia-industrial-electricity-price",
        label: "Industrial electricity price",
        value: eiaIndustrialPrice ? `${eiaIndustrialPrice.value.toFixed(2)}` : "Needs EIA key",
        unit: eiaIndustrialPrice?.unit ?? "cents per kilowatthour",
        geography: "Florida",
        period: eiaIndustrialPrice?.period ?? "not connected",
        sourceId: "eia_electricity_api",
        status: eiaIndustrialPrice ? "live" : "needs_key",
        read: eiaIndustrialPrice
          ? "Power-cost monitoring is live, which matters for AI infrastructure, advanced manufacturing, and data-center competitiveness."
          : "Power-cost monitoring is wired but waiting on EIA_API_KEY.",
        sourceUrl: FEDERAL_SOURCE_URLS.eiaElectricity,
        caveat: eiaIndustrialPrice ? undefined : "Set EIA_API_KEY to activate electricity price and sales feeds.",
      },
      refreshedAt,
    ),
    signal(
      {
        id: "irs-income-migration",
        label: "Income migration",
        value: "Download queue",
        unit: "AGI flows",
        geography: "State and county flows",
        period: "IRS SOI latest available",
        sourceId: "irs_soi_migration_download",
        status: "download_required",
        read: "IRS SOI is the right official layer for income migration, but it is a download pipeline rather than a clean JSON endpoint.",
        sourceUrl: FEDERAL_SOURCE_URLS.irsMigration,
        caveat: "Build a separate IRS SOI ingest job for county-to-county and state-to-state migration files.",
      },
      refreshedAt,
    ),
  ];

  return {
    headline: "Federal data spine",
    summary:
      "BLS is already live. Census, BEA, EIA, and IRS are now represented as explicit feed contracts so the dashboard can separate live federal metrics from safe fallbacks and download-only official sources.",
    refreshedAt,
    sources,
    signals,
    missingKeys,
    nextFeeds: [
      ...(missingKeys.includes("CENSUS_API_KEY")
        ? ["Add CENSUS_API_KEY to turn Business Formation Statistics and state export reconciliation into direct Census API calls."]
        : ["Extend Census feeds from statewide exports into monthly commodity and partner-market detail."]),
      ...(missingKeys.includes("BEA_API_KEY")
        ? ["Add BEA_API_KEY and replace the FRED bridge for real GSP with direct BEA Regional API pulls."]
        : ["Extend BEA Regional API coverage into personal income, GDP by industry, and metro/county output layers."]),
      ...(missingKeys.includes("EIA_API_KEY")
        ? ["Add EIA_API_KEY to activate power-cost, sales, and capacity proxies for the AI infrastructure thesis."]
        : ["Extend EIA feeds from industrial price into sales, load, generation mix, and interconnection proxy data."]),
      "Build the IRS SOI download ingest for income migration and AGI flows by state and county.",
    ],
  };
}
