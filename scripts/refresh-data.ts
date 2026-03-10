import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type BlsPoint = {
  year: string;
  period: string;
  value: string;
};

type BlsSeries = {
  seriesID: string;
  data: BlsPoint[];
};

type TimePoint = {
  date: string;
  value: number;
};

type Delta = {
  years: number;
  baseDate: string;
  absolute: number;
  percent: number | null;
};

type MetricUnit = "percent" | "persons" | "thousands_jobs" | "count" | "usd_millions";
type MetricSource = "BLS" | "FRED" | "Census_via_FRED";

type Metric = {
  id: string;
  label: string;
  unit: MetricUnit;
  trendDirection: "up_good" | "down_good";
  latest: TimePoint;
  deltas: {
    oneYear: Delta | null;
    threeYear: Delta | null;
    fiveYear: Delta | null;
  };
  sparkline: TimePoint[];
  series: TimePoint[];
  source: MetricSource;
};

type PopulationMetric = {
  id: "population";
  label: "Population";
  unit: "persons";
  trendDirection: "up_good";
  latest: TimePoint;
  deltas: {
    oneYear: Delta | null;
    threeYear: Delta | null;
    fiveYear: Delta | null;
  };
  sparkline: TimePoint[];
  series: TimePoint[];
  source: "Census_via_FRED";
};

type MetroSnapshot = {
  id: string;
  name: string;
  unemploymentRate: Pick<Metric, "latest" | "deltas" | "sparkline">;
  laborForce: Pick<Metric, "latest" | "deltas" | "sparkline">;
  employmentLevel: Pick<Metric, "latest" | "deltas" | "sparkline">;
};

type IndustrySector = {
  id: string;
  label: string;
  latest: TimePoint;
  deltas: Metric["deltas"];
  sparkline: TimePoint[];
  source: "BLS";
};

type InnovationMetricId =
  | "informationEmployment"
  | "professionalBusinessEmployment"
  | "businessApplications"
  | "realGsp"
  | "constructionEmployment";

type InnovationResource = {
  id: string;
  name: string;
  category: "Capital" | "Programs" | "Ecosystem" | "Policy" | "Infrastructure";
  region: "Statewide" | "Miami" | "Tampa Bay" | "Orlando" | "Jacksonville";
  summary: string;
  url: string;
};

type DashboardDataset = {
  generatedAt: string;
  asOfLaborMarket: string;
  asOfPopulation: string;
  sources: Array<{
    id: string;
    name: string;
    url: string;
    notes: string;
  }>;
  heroMetrics: Array<"unemploymentRate" | "laborForce" | "nonfarmPayrolls" | "population" | "employmentLevel">;
  metrics: {
    unemploymentRate: Metric;
    laborForce: Metric;
    employmentLevel: Metric;
    nonfarmPayrolls: Metric;
    population: PopulationMetric;
  };
  industry: {
    sectors: IndustrySector[];
    strongestGrowers: IndustrySector[];
    laggards: IndustrySector[];
  };
  metros: MetroSnapshot[];
  narrative: {
    headline: string;
    whatStandsOut: string[];
    improving: string[];
    softening: string[];
    whyItMatters: string[];
  };
  innovation: {
    heroMetrics: InnovationMetricId[];
    metrics: Record<InnovationMetricId, Metric>;
    narrative: {
      headline: string;
      signals: string[];
      development: string[];
      momentum: string[];
    };
    resources: InnovationResource[];
  };
};

const CURRENT_YEAR = new Date().getUTCFullYear();
const START_YEAR = String(CURRENT_YEAR - 9);
const END_YEAR = String(CURRENT_YEAR);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_FILE = path.join(ROOT, "public", "data", "florida-economy.json");

const CORE_SERIES: Array<{
  id: keyof DashboardDataset["metrics"];
  label: string;
  seriesId: string;
  unit: Metric["unit"];
  trendDirection: Metric["trendDirection"];
}> = [
  {
    id: "unemploymentRate",
    label: "Unemployment Rate",
    seriesId: "LAUST120000000000003",
    unit: "percent",
    trendDirection: "down_good",
  },
  {
    id: "laborForce",
    label: "Labor Force",
    seriesId: "LAUST120000000000006",
    unit: "persons",
    trendDirection: "up_good",
  },
  {
    id: "employmentLevel",
    label: "Employment Level",
    seriesId: "LAUST120000000000005",
    unit: "persons",
    trendDirection: "up_good",
  },
  {
    id: "nonfarmPayrolls",
    label: "Nonfarm Payrolls",
    seriesId: "SMS12000000000000001",
    unit: "thousands_jobs",
    trendDirection: "up_good",
  },
];

const INDUSTRY_SERIES = [
  { id: "construction", label: "Construction", seriesId: "SMS12000002000000001" },
  { id: "manufacturing", label: "Manufacturing", seriesId: "SMS12000003000000001" },
  {
    id: "trade_transport_utilities",
    label: "Trade, Transportation, Utilities",
    seriesId: "SMS12000004000000001",
  },
  { id: "information", label: "Information", seriesId: "SMS12000005000000001" },
  { id: "financial_activities", label: "Financial Activities", seriesId: "SMS12000005500000001" },
  {
    id: "professional_business_services",
    label: "Professional & Business Services",
    seriesId: "SMS12000006000000001",
  },
  {
    id: "private_education_health_services",
    label: "Private Education & Health Services",
    seriesId: "SMS12000006500000001",
  },
  { id: "leisure_hospitality", label: "Leisure & Hospitality", seriesId: "SMS12000007000000001" },
  { id: "other_services", label: "Other Services", seriesId: "SMS12000008000000001" },
  { id: "government", label: "Government", seriesId: "SMS12000009000000001" },
] as const;

const METRO_DEFS = [
  { id: "miami", name: "Miami MSA", lausRoot: "LAUMT123310000000" },
  { id: "tampa", name: "Tampa MSA", lausRoot: "LAUMT124530000000" },
  { id: "orlando", name: "Orlando MSA", lausRoot: "LAUMT123674000000" },
  { id: "jacksonville", name: "Jacksonville MSA", lausRoot: "LAUMT122726000000" },
] as const;

const INNOVATION_FRED_SERIES = {
  businessApplications: "BABATOTALSAFL",
  realGsp: "FLRGSP",
} as const;

const INNOVATION_RESOURCES: InnovationResource[] = [
  {
    id: "select-florida",
    name: "SelectFlorida",
    category: "Programs",
    region: "Statewide",
    summary: "Statewide business attraction and expansion support hub.",
    url: "https://www.selectflorida.org/",
  },
  {
    id: "florida-sbdc",
    name: "Florida SBDC Network",
    category: "Programs",
    region: "Statewide",
    summary: "Small business advisory, growth planning, and operator support across Florida.",
    url: "https://floridasbdc.org/",
  },
  {
    id: "space-florida",
    name: "Space Florida",
    category: "Infrastructure",
    region: "Statewide",
    summary: "Aerospace infrastructure, financing, and advanced-industry growth platform.",
    url: "https://www.spaceflorida.gov/",
  },
  {
    id: "fl-high-tech-corridor",
    name: "Florida High Tech Corridor",
    category: "Ecosystem",
    region: "Statewide",
    summary: "University-industry innovation programs connecting talent and applied R&D.",
    url: "https://floridahightech.com/",
  },
  {
    id: "fl-venture-forum",
    name: "Florida Venture Forum",
    category: "Capital",
    region: "Statewide",
    summary: "Investor-founder network and venture ecosystem access across Florida.",
    url: "https://www.flventure.org/",
  },
  {
    id: "beacon-council",
    name: "Miami-Dade Beacon Council",
    category: "Ecosystem",
    region: "Miami",
    summary: "Regional economic development and innovation ecosystem connector.",
    url: "https://www.beaconcouncil.com/",
  },
  {
    id: "tampa-bay-wave",
    name: "Tampa Bay Wave",
    category: "Programs",
    region: "Tampa Bay",
    summary: "Startup acceleration, mentoring, and founder resources in Tampa Bay.",
    url: "https://www.tampabaywave.org/",
  },
  {
    id: "emerge-americas",
    name: "eMerge Americas",
    category: "Ecosystem",
    region: "Miami",
    summary: "Major Florida innovation conference and ecosystem convening platform.",
    url: "https://www.emergeamericas.com/",
  },
  {
    id: "embarc-collective",
    name: "Embarc Collective",
    category: "Programs",
    region: "Tampa Bay",
    summary: "Venture-scale startup hub and founder support platform in Tampa Bay.",
    url: "https://www.embarccollective.com/",
  },
  {
    id: "florida-council-of-100",
    name: "Florida Council of 100",
    category: "Policy",
    region: "Statewide",
    summary: "Business-led statewide policy organization focused on Florida's long-term competitiveness.",
    url: "https://www.fc100.org/",
  },
  {
    id: "florida-chamber",
    name: "Florida Chamber of Commerce",
    category: "Policy",
    region: "Statewide",
    summary: "Statewide business policy and economic competitiveness organization.",
    url: "https://www.flchamber.com/",
  },
  {
    id: "orlando-ep",
    name: "Orlando Economic Partnership",
    category: "Ecosystem",
    region: "Orlando",
    summary: "Regional growth platform for industry, talent, and innovation ecosystems.",
    url: "https://orlando.org/",
  },
  {
    id: "jax-usa",
    name: "JAXUSA Partnership",
    category: "Policy",
    region: "Jacksonville",
    summary: "Jacksonville-region business development and strategic growth initiatives.",
    url: "https://www.jaxusa.org/",
  },
];

function metricSeriesId(root: string, measureCode: "003" | "005" | "006") {
  return `${root}${measureCode}`;
}

function parseBlsMonthly(series: BlsSeries): TimePoint[] {
  return series.data
    .filter((d) => /^M\d{2}$/.test(d.period))
    .map((d) => ({
      date: `${d.year}-${d.period.slice(1)}-01`,
      value: Number.parseFloat(d.value),
    }))
    .filter((d) => Number.isFinite(d.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getBasePoint(series: TimePoint[], yearsBack: number): TimePoint | null {
  const latest = series.at(-1);
  if (!latest) {
    return null;
  }

  const target = new Date(latest.date);
  target.setUTCFullYear(target.getUTCFullYear() - yearsBack);

  for (let index = series.length - 1; index >= 0; index -= 1) {
    const current = series[index];
    if (new Date(current.date) <= target) {
      return current;
    }
  }

  return null;
}

function computeDelta(series: TimePoint[], yearsBack: 1 | 3 | 5): Delta | null {
  const latest = series.at(-1);
  const base = getBasePoint(series, yearsBack);
  if (!latest || !base) {
    return null;
  }

  const absolute = latest.value - base.value;
  const percent = base.value === 0 ? null : (absolute / base.value) * 100;

  return {
    years: yearsBack,
    baseDate: base.date,
    absolute,
    percent,
  };
}

function buildDeltas(series: TimePoint[]): Metric["deltas"] {
  return {
    oneYear: computeDelta(series, 1),
    threeYear: computeDelta(series, 3),
    fiveYear: computeDelta(series, 5),
  };
}

function latestPoint(series: TimePoint[]): TimePoint {
  const point = series.at(-1);
  if (!point) {
    throw new Error("No time points available for series");
  }
  return point;
}

function lastN<T>(values: T[], size: number): T[] {
  return values.slice(Math.max(values.length - size, 0));
}

async function fetchBlsSeries(seriesIds: string[]): Promise<Record<string, TimePoint[]>> {
  const result: Record<string, TimePoint[]> = {};

  const chunkSize = 24;
  for (let start = 0; start < seriesIds.length; start += chunkSize) {
    const chunk = seriesIds.slice(start, start + chunkSize);
    const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seriesid: chunk,
        startyear: START_YEAR,
        endyear: END_YEAR,
        ...(process.env.BLS_API_KEY ? { registrationkey: process.env.BLS_API_KEY } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`BLS request failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      status: string;
      message?: string[];
      Results?: {
        series: BlsSeries[];
      };
    };

    if (payload.status !== "REQUEST_SUCCEEDED" || !payload.Results?.series) {
      throw new Error(`BLS request unsuccessful: ${payload.message?.join("; ") ?? "unknown error"}`);
    }

    for (const series of payload.Results.series) {
      result[series.seriesID] = parseBlsMonthly(series);
    }
  }

  return result;
}

async function fetchFredSeries(seriesId: string, transformValue?: (value: number) => number): Promise<TimePoint[]> {
  const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`);
  if (!response.ok) {
    throw new Error(`FRED series request failed for ${seriesId} with HTTP ${response.status}`);
  }

  const csv = await response.text();
  const lines = csv.trim().split("\n").slice(1);

  return lines
    .map((line) => {
      const [date, rawValue] = line.split(",");
      if (!date || !rawValue || rawValue === ".") {
        return null;
      }

      const thousands = Number.parseFloat(rawValue);
      if (!Number.isFinite(thousands)) {
        return null;
      }

      const transformed = transformValue ? transformValue(thousands) : thousands;

      return {
        date,
        value: transformed,
      };
    })
    .filter((point): point is TimePoint => Boolean(point))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function deltaMagnitude(delta: Delta | null): number {
  return delta?.percent ?? Number.NEGATIVE_INFINITY;
}

function deltaAbs(delta: Delta | null): number {
  return delta?.absolute ?? 0;
}

function prettyMonth(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function normalizeForComparison(dataset: DashboardDataset): Omit<DashboardDataset, "generatedAt"> {
  const { generatedAt, ...rest } = dataset;
  void generatedAt;
  return rest;
}

function buildNarrative(dataset: {
  metrics: DashboardDataset["metrics"];
  strongestGrowers: IndustrySector[];
  laggards: IndustrySector[];
}): DashboardDataset["narrative"] {
  const unemployment = dataset.metrics.unemploymentRate;
  const laborForce = dataset.metrics.laborForce;
  const payrolls = dataset.metrics.nonfarmPayrolls;
  const population = dataset.metrics.population;

  const unemploymentYoy = unemployment.deltas.oneYear?.absolute ?? 0;
  const laborForceYoy = laborForce.deltas.oneYear?.absolute ?? 0;
  const payrollYoy = payrolls.deltas.oneYear?.absolute ?? 0;

  const headline =
    payrollYoy > 0 && laborForceYoy > 0
      ? "Florida is expanding both jobs and labor supply at the same time."
      : "Florida remains large and dynamic, with selective signs to watch.";

  const whatStandsOut = [
    `${payrolls.label} are ${payrollYoy >= 0 ? "up" : "down"} ${Math.abs(payrollYoy).toFixed(1)}k over the last year.`,
    `${laborForce.label} is ${laborForceYoy >= 0 ? "up" : "down"} ${Math.abs(laborForceYoy).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} people year-over-year.`,
    `Population reached ${Math.round(population.latest.value).toLocaleString("en-US")} in ${new Date(
      population.latest.date,
    ).getUTCFullYear()}.`,
  ];

  const improving = [
    unemploymentYoy < 0
      ? `Unemployment improved by ${Math.abs(unemploymentYoy).toFixed(1)} percentage points year-over-year.`
      : `Unemployment remains low by historical standards despite a ${unemploymentYoy.toFixed(1)} point annual increase.`,
    ...dataset.strongestGrowers.map((sector) => {
      const yoy = sector.deltas.oneYear?.percent;
      const pct = yoy === null || yoy === undefined ? "n/a" : `${yoy.toFixed(1)}%`;
      return `${sector.label} is among the strongest job growers (${pct} YoY).`;
    }),
  ];

  const softening = [
    ...dataset.laggards
      .filter((sector) => deltaAbs(sector.deltas.oneYear) < 0)
      .map((sector) => {
        const yoy = sector.deltas.oneYear?.percent;
        return `${sector.label} is softer (${yoy?.toFixed(1) ?? "n/a"}% YoY).`;
      }),
  ];

  if (softening.length === 0) {
    softening.push("No major supersector is contracting year-over-year in this release.");
  }

  const whyItMatters = [
    "A growing labor force plus payroll expansion signals depth, not just short-term demand spikes.",
    "Sector breadth helps Florida absorb national volatility while keeping opportunity distributed.",
    "Population gains reinforce long-run demand for housing, services, and infrastructure investment.",
  ];

  return {
    headline,
    whatStandsOut,
    improving,
    softening,
    whyItMatters,
  };
}

function buildInnovationNarrative(metrics: Record<InnovationMetricId, Metric>) {
  const businessApps = metrics.businessApplications;
  const realGsp = metrics.realGsp;
  const informationJobs = metrics.informationEmployment;
  const proBizJobs = metrics.professionalBusinessEmployment;
  const construction = metrics.constructionEmployment;

  const businessAppsYoy = businessApps.deltas.oneYear?.percent ?? 0;
  const realGspThreeYear = realGsp.deltas.threeYear?.percent ?? 0;
  const infoYoy = informationJobs.deltas.oneYear?.percent ?? 0;
  const proBizYoy = proBizJobs.deltas.oneYear?.percent ?? 0;
  const constructionYoy = construction.deltas.oneYear?.percent ?? 0;

  return {
    headline:
      businessAppsYoy >= 0 && proBizYoy >= 0
        ? "Florida’s innovation stack is expanding alongside its development engine."
        : "Florida’s innovation stack remains large, with selective areas requiring watchfulness.",
    signals: [
      `Business applications are ${businessAppsYoy >= 0 ? "up" : "down"} ${Math.abs(businessAppsYoy).toFixed(1)}% year-over-year.`,
      `Information employment is ${infoYoy >= 0 ? "up" : "down"} ${Math.abs(infoYoy).toFixed(1)}% year-over-year.`,
      `Professional & business services employment is ${proBizYoy >= 0 ? "up" : "down"} ${Math.abs(proBizYoy).toFixed(1)}% year-over-year.`,
    ],
    development: [
      `Real gross state product is ${realGspThreeYear >= 0 ? "up" : "down"} ${Math.abs(realGspThreeYear).toFixed(1)}% over three years.`,
      `Construction employment is ${constructionYoy >= 0 ? "up" : "down"} ${Math.abs(constructionYoy).toFixed(1)}% year-over-year.`,
    ],
    momentum: [
      "Innovation metrics are intended as directional signal layers, not standalone verdicts.",
      "Business formation plus advanced-service employment growth is a strong expansion pattern.",
      "Development capacity and innovation capacity should be tracked together for policy and capital allocation.",
    ],
  };
}

type ExistingDatasetFallback = {
  metrics?: Record<string, { series?: TimePoint[] }>;
  industry?: { sectors?: Array<{ id: string; sparkline?: TimePoint[] }> };
  metros?: Array<{
    id: string;
    unemploymentRate?: { sparkline?: TimePoint[] };
    laborForce?: { sparkline?: TimePoint[] };
    employmentLevel?: { sparkline?: TimePoint[] };
  }>;
};

function buildBlsDataFromExisting(existing: ExistingDatasetFallback): Record<string, TimePoint[]> {
  const cached: Record<string, TimePoint[]> = {};

  for (const series of CORE_SERIES) {
    const points = existing.metrics?.[series.id]?.series ?? [];
    if (points.length > 0) {
      cached[series.seriesId] = points;
    }
  }

  const sectorMap = new Map((existing.industry?.sectors ?? []).map((sector) => [sector.id, sector]));
  for (const series of INDUSTRY_SERIES) {
    const points = sectorMap.get(series.id)?.sparkline ?? [];
    if (points.length > 0) {
      cached[series.seriesId] = points;
    }
  }

  const metroMap = new Map((existing.metros ?? []).map((metro) => [metro.id, metro]));
  for (const metro of METRO_DEFS) {
    const cachedMetro = metroMap.get(metro.id);
    const unemployment = cachedMetro?.unemploymentRate?.sparkline ?? [];
    const laborForce = cachedMetro?.laborForce?.sparkline ?? [];
    const employment = cachedMetro?.employmentLevel?.sparkline ?? [];

    if (unemployment.length > 0) {
      cached[metricSeriesId(metro.lausRoot, "003")] = unemployment;
    }
    if (laborForce.length > 0) {
      cached[metricSeriesId(metro.lausRoot, "006")] = laborForce;
    }
    if (employment.length > 0) {
      cached[metricSeriesId(metro.lausRoot, "005")] = employment;
    }
  }

  return cached;
}

async function main() {
  const coreSeriesIds = CORE_SERIES.map((series) => series.seriesId);
  const industrySeriesIds = INDUSTRY_SERIES.map((series) => series.seriesId);
  const metroSeriesIds = METRO_DEFS.flatMap((metro) => [
    metricSeriesId(metro.lausRoot, "003"),
    metricSeriesId(metro.lausRoot, "006"),
    metricSeriesId(metro.lausRoot, "005"),
  ]);

  const allBlsIds = [...coreSeriesIds, ...industrySeriesIds, ...metroSeriesIds];
  let blsData: Record<string, TimePoint[]>;
  try {
    blsData = await fetchBlsSeries(allBlsIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("daily threshold")) {
      throw error;
    }

    const existingRaw = await readFile(OUTPUT_FILE, "utf8");
    const existing = JSON.parse(existingRaw) as ExistingDatasetFallback;
    blsData = buildBlsDataFromExisting(existing);
    console.warn("BLS daily threshold reached. Reusing cached BLS series from existing dataset.");
  }

  const [populationSeries, businessApplicationsSeries, realGspSeries] = await Promise.all([
    fetchFredSeries("FLPOP", (value) => value * 1000),
    fetchFredSeries(INNOVATION_FRED_SERIES.businessApplications),
    fetchFredSeries(INNOVATION_FRED_SERIES.realGsp),
  ]);

  const metrics = Object.fromEntries(
    CORE_SERIES.map((series) => {
      const points = blsData[series.seriesId] ?? [];
      if (points.length === 0) {
        throw new Error(`Missing data for core series: ${series.seriesId}`);
      }

      const metric: Metric = {
        id: series.id,
        label: series.label,
        unit: series.unit,
        trendDirection: series.trendDirection,
        latest: latestPoint(points),
        deltas: buildDeltas(points),
        sparkline: lastN(points, 36),
        series: points,
        source: "BLS",
      };

      return [series.id, metric];
    }),
  ) as DashboardDataset["metrics"];

  const population: PopulationMetric = {
    id: "population",
    label: "Population",
    unit: "persons",
    trendDirection: "up_good",
    latest: latestPoint(populationSeries),
    deltas: buildDeltas(populationSeries),
    sparkline: lastN(populationSeries, 15),
    series: populationSeries,
    source: "Census_via_FRED",
  };

  metrics.population = population;

  const industrySectors: IndustrySector[] = INDUSTRY_SERIES.map((series) => {
    const points = blsData[series.seriesId] ?? [];
    if (points.length === 0) {
      throw new Error(`Missing data for industry series: ${series.seriesId}`);
    }

    return {
      id: series.id,
      label: series.label,
      latest: latestPoint(points),
      deltas: buildDeltas(points),
      sparkline: lastN(points, 36),
      source: "BLS",
    };
  });

  const strongestGrowers = [...industrySectors]
    .sort((a, b) => deltaMagnitude(b.deltas.oneYear) - deltaMagnitude(a.deltas.oneYear))
    .slice(0, 3);

  const laggards = [...industrySectors]
    .sort((a, b) => deltaMagnitude(a.deltas.oneYear) - deltaMagnitude(b.deltas.oneYear))
    .slice(0, 3);

  const informationEmploymentSeries = blsData["SMS12000005000000001"] ?? [];
  const professionalBusinessSeries = blsData["SMS12000006000000001"] ?? [];
  const constructionSeries = blsData["SMS12000002000000001"] ?? [];

  if (
    informationEmploymentSeries.length === 0 ||
    professionalBusinessSeries.length === 0 ||
    constructionSeries.length === 0 ||
    businessApplicationsSeries.length === 0 ||
    realGspSeries.length === 0
  ) {
    throw new Error("Missing one or more innovation/economic development series.");
  }

  const innovationMetrics: Record<InnovationMetricId, Metric> = {
    informationEmployment: {
      id: "informationEmployment",
      label: "Information Employment",
      unit: "thousands_jobs",
      trendDirection: "up_good",
      latest: latestPoint(informationEmploymentSeries),
      deltas: buildDeltas(informationEmploymentSeries),
      sparkline: lastN(informationEmploymentSeries, 36),
      series: informationEmploymentSeries,
      source: "BLS",
    },
    professionalBusinessEmployment: {
      id: "professionalBusinessEmployment",
      label: "Professional & Business Services Employment",
      unit: "thousands_jobs",
      trendDirection: "up_good",
      latest: latestPoint(professionalBusinessSeries),
      deltas: buildDeltas(professionalBusinessSeries),
      sparkline: lastN(professionalBusinessSeries, 36),
      series: professionalBusinessSeries,
      source: "BLS",
    },
    businessApplications: {
      id: "businessApplications",
      label: "Business Applications",
      unit: "count",
      trendDirection: "up_good",
      latest: latestPoint(businessApplicationsSeries),
      deltas: buildDeltas(businessApplicationsSeries),
      sparkline: lastN(businessApplicationsSeries, 36),
      series: businessApplicationsSeries,
      source: "FRED",
    },
    realGsp: {
      id: "realGsp",
      label: "Real Gross State Product",
      unit: "usd_millions",
      trendDirection: "up_good",
      latest: latestPoint(realGspSeries),
      deltas: buildDeltas(realGspSeries),
      sparkline: lastN(realGspSeries, 20),
      series: realGspSeries,
      source: "FRED",
    },
    constructionEmployment: {
      id: "constructionEmployment",
      label: "Construction Employment",
      unit: "thousands_jobs",
      trendDirection: "up_good",
      latest: latestPoint(constructionSeries),
      deltas: buildDeltas(constructionSeries),
      sparkline: lastN(constructionSeries, 36),
      series: constructionSeries,
      source: "BLS",
    },
  };

  const metros: MetroSnapshot[] = METRO_DEFS.map((metro) => {
    const unemployment = blsData[metricSeriesId(metro.lausRoot, "003")] ?? [];
    const laborForce = blsData[metricSeriesId(metro.lausRoot, "006")] ?? [];
    const employment = blsData[metricSeriesId(metro.lausRoot, "005")] ?? [];

    if (unemployment.length === 0 || laborForce.length === 0 || employment.length === 0) {
      throw new Error(`Missing metro series for ${metro.name}`);
    }

    return {
      id: metro.id,
      name: metro.name,
      unemploymentRate: {
        latest: latestPoint(unemployment),
        deltas: buildDeltas(unemployment),
        sparkline: lastN(unemployment, 24),
      },
      laborForce: {
        latest: latestPoint(laborForce),
        deltas: buildDeltas(laborForce),
        sparkline: lastN(laborForce, 24),
      },
      employmentLevel: {
        latest: latestPoint(employment),
        deltas: buildDeltas(employment),
        sparkline: lastN(employment, 24),
      },
    };
  });

  const narrative = buildNarrative({
    metrics,
    strongestGrowers,
    laggards,
  });

  const dataset: DashboardDataset = {
    generatedAt: new Date().toISOString(),
    asOfLaborMarket: prettyMonth(metrics.unemploymentRate.latest.date),
    asOfPopulation: String(new Date(metrics.population.latest.date).getUTCFullYear()),
    sources: [
      {
        id: "bls",
        name: "Bureau of Labor Statistics (LAUS + CES)",
        url: "https://www.bls.gov/developers/",
        notes: "Monthly state and metro labor market + payroll employment series.",
      },
      {
        id: "census_population",
        name: "U.S. Census Bureau Population Estimates (via FRED FLPOP)",
        url: "https://fred.stlouisfed.org/series/FLPOP",
        notes: "Annual Florida resident population (source notes cite U.S. Census Bureau).",
      },
      {
        id: "fred_innovation",
        name: "FRED state innovation/development indicators",
        url: "https://fred.stlouisfed.org/",
        notes: "Business applications and real gross state product series used for innovation/economic development tab.",
      },
    ],
    heroMetrics: ["unemploymentRate", "laborForce", "nonfarmPayrolls", "population", "employmentLevel"],
    metrics,
    industry: {
      sectors: industrySectors,
      strongestGrowers,
      laggards,
    },
    metros,
    narrative,
    innovation: {
      heroMetrics: [
        "informationEmployment",
        "professionalBusinessEmployment",
        "businessApplications",
        "realGsp",
        "constructionEmployment",
      ],
      metrics: innovationMetrics,
      narrative: buildInnovationNarrative(innovationMetrics),
      resources: INNOVATION_RESOURCES,
    },
  };

  try {
    const existingRaw = await readFile(OUTPUT_FILE, "utf8");
    const existing = JSON.parse(existingRaw) as DashboardDataset;
    if (
      JSON.stringify(normalizeForComparison(existing)) === JSON.stringify(normalizeForComparison(dataset))
    ) {
      dataset.generatedAt = existing.generatedAt;
    }
  } catch {
    // No prior dataset or invalid JSON; continue with a fresh write.
  }

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`As-of labor market: ${dataset.asOfLaborMarket}; population: ${dataset.asOfPopulation}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
