import { assertPublicDataset } from "./lib/public-data";
import { reconcileObservations } from "./lib/reconcile";
import { buildMetroComparison, comparisonSeriesIds } from "./lib/metro-comparison";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFederalDataLayer } from "./federal-data";
import {
  buildDeltas,
  deltaAbs,
  deltaMagnitude,
  lastN,
  latestPoint,
  metricSeriesId,
  prettyMonth,
  statePayrollSeriesId,
  stateLausSeriesId,
} from "./lib/series";
import { fetchBlsSeries, fetchFredSeries } from "./lib/sources";
import { buildLeadingSection } from "./lib/leading";
import { buildBenchmarksSection } from "./lib/benchmarks";
import { fetchWserReleaseInfo, floridaIsoDate, WSER_SOURCE } from "./lib/wser";
import type {
  DataTrustLayer,
  DashboardDataset,
  DashboardSource,
  GovernmentGrantsLedger,
  IndustrySector,
  InnovationMetricId,
  InnovationResource,
  Metric,
  MetroSnapshot,
  PeerStateSnapshot,
  PopulationMetric,
  ProjectCapexLedger,
  StrategyLayer,
  TalentMatchLayer,
  TerminalLayer,
  TimePoint,
} from "../src/types/dashboard";

type PreservedSections = Pick<DashboardDataset, "scorecard2030" | "competition" | "distinctives" | "trade">;

const CURRENT_YEAR = new Date().getUTCFullYear();
const START_YEAR = String(CURRENT_YEAR - 9);
const END_YEAR = String(CURRENT_YEAR);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_FILE = path.join(ROOT, "public", "data", "florida-economy.json");
const PROJECT_CAPEX_LEDGER_FILE = path.join(ROOT, "data", "project-capex-ledger.json");
const GOVERNMENT_GRANTS_LEDGER_FILE = path.join(ROOT, "data", "government-grants-ledger.json");
const TALENT_MATCH_FILE = path.join(ROOT, "data", "talent-match.json");

async function readProjectCapexLedger(): Promise<ProjectCapexLedger> {
  return JSON.parse(await readFile(PROJECT_CAPEX_LEDGER_FILE, "utf8")) as ProjectCapexLedger;
}

async function readGovernmentGrantsLedger(): Promise<GovernmentGrantsLedger> {
  return JSON.parse(await readFile(GOVERNMENT_GRANTS_LEDGER_FILE, "utf8")) as GovernmentGrantsLedger;
}

async function readTalentMatch(): Promise<TalentMatchLayer> {
  return JSON.parse(await readFile(TALENT_MATCH_FILE, "utf8")) as TalentMatchLayer;
}

function classifySource(source: DashboardSource): NonNullable<DashboardSource["classification"]> {
  if (source.classification) {
    return source.classification;
  }

  const id = source.id.toLowerCase();
  const haystack = `${source.id} ${source.name} ${source.url}`.toLowerCase();

  if (
    ["florida_chamber", "florida_taxwatch", "james_madison", "fc100", "mass_competitiveness", "texas_2036"].some(
      (token) => id.includes(token),
    )
  ) {
    return "advocacy_analysis";
  }

  if (
    ["governor", "selectflorida", "space_florida", "blue_origin", "on_target"].some((token) => id.includes(token))
  ) {
    return "official_announcement";
  }

  if (
    [
      "bls",
      "census",
      "fred",
      "world_bank",
      "wser",
      "federal_data",
      "comptroller",
      "portmiami",
      "port_everglades",
      "tennessee_e2e",
      "north_carolina_evi",
      "washington_stem",
      "florida_senate",
    ].some((token) => haystack.includes(token))
  ) {
    return "official_data";
  }

  return "industry_research";
}

function mergeSources(...sourceLists: DashboardDataset["sources"][]): DashboardDataset["sources"] {
  const seen = new Set<string>();
  const merged: DashboardDataset["sources"] = [];

  for (const sourceList of sourceLists) {
    for (const source of sourceList) {
      const key = `${source.id}|${source.url}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push({ ...source, classification: classifySource(source) });
    }
  }

  return merged;
}

function buildTrustLayer({
  metrics,
  releaseInfo,
  existing,
}: {
  metrics: DashboardDataset["metrics"];
  releaseInfo: Awaited<ReturnType<typeof fetchWserReleaseInfo>>;
  existing: DashboardDataset | null;
}): DataTrustLayer {
  const today = floridaIsoDate();
  const previousLabor = existing?.trust?.releaseCalendar.find((item) => item.id === "florida-labor");
  const period = prettyMonth(metrics.nonfarmPayrolls.latest.date);
  // A schedule due date is not proof that this observation was released that day.
  // Retain a verified date only for the same observation period.
  const latestReleaseDate = previousLabor?.latestPeriod === period ? previousLabor.latestReleaseDate : null;
  const nextExpectedRelease =
    releaseInfo.scheduledDates.find((date) => date > today) ??
    (previousLabor?.nextExpectedRelease && previousLabor.nextExpectedRelease > today ? previousLabor.nextExpectedRelease : null);
  const laborRevision = "Preliminary monthly estimate; subject to BLS monthly and annual benchmark revisions.";
  const laborSourceUrl = releaseInfo.files.fullRelease;
  const laborMetricIds: Array<keyof Omit<DashboardDataset["metrics"], "population">> = [
    "unemploymentRate",
    "laborForce",
    "employmentLevel",
    "nonfarmPayrolls",
  ];

  return {
    methodologyVersion: "2026-09-10",
    review: existing?.trust.review,
    metricVintages: [
      ...laborMetricIds.map((metricId) => {
        const metric = metrics[metricId];
        return {
          metricId,
          label: metric.label,
          observationDate: metric.latest.date,
          observationPeriod: prettyMonth(metric.latest.date),
          releaseDate: latestReleaseDate,
          nextExpectedRelease,
          revisionStatus: laborRevision,
          sourceClass: "official_data" as const,
          sourceLabel: "FloridaCommerce WSER / BLS",
          sourceUrl: laborSourceUrl,
        };
      }),
      {
        metricId: "population",
        label: metrics.population.label,
        observationDate: metrics.population.latest.date,
        observationPeriod: String(new Date(metrics.population.latest.date).getUTCFullYear()),
        releaseDate: null,
        nextExpectedRelease: null,
        revisionStatus: "Annual Census estimate; prior vintages may be revised when a new estimate series is published.",
        sourceClass: "official_data",
        sourceLabel: "U.S. Census Bureau via FRED",
        sourceUrl: "https://fred.stlouisfed.org/series/FLPOP",
      },
    ],
    releaseCalendar: [
      {
        id: "florida-labor",
        label: "Florida employment and unemployment",
        cadence: "monthly",
        latestPeriod: prettyMonth(metrics.nonfarmPayrolls.latest.date),
        latestReleaseDate,
        nextExpectedRelease,
        sourceLabel: "FloridaCommerce monthly data releases",
        sourceUrl: releaseInfo.releasesPageUrl,
        note: "LAUS and CES headline metrics. A scheduled release date can move; Floridanomics confirms the new period before publishing.",
      },
      {
        id: "florida-population",
        label: "Florida population estimate",
        cadence: "annual",
        latestPeriod: String(new Date(metrics.population.latest.date).getUTCFullYear()),
        latestReleaseDate: null,
        nextExpectedRelease: null,
        sourceLabel: "U.S. Census Bureau Population Estimates",
        sourceUrl: "https://www.census.gov/programs-surveys/popest.html",
        note: "Annual estimate with vintage revisions; Floridanomics does not infer an exact next publication date.",
      },
    ],
    sourceClasses: [
      {
        id: "official_data",
        label: "Official data",
        description: "Statistical releases, APIs, tables, and administrative records published by public agencies.",
      },
      {
        id: "official_announcement",
        label: "Official announcement",
        description: "Government or public-authority releases describing laws, awards, projects, or agency actions.",
      },
      {
        id: "industry_research",
        label: "Industry research",
        description: "Company disclosures, trade research, market reports, and reporting outside government statistics.",
      },
      {
        id: "advocacy_analysis",
        label: "Advocacy and analysis",
        description: "Chamber, think-tank, nonprofit, and policy-organization analysis with an institutional point of view.",
      },
      {
        id: "editorial_inference",
        label: "Editorial inference",
        description: "Floridanomics interpretation assembled from cited evidence; it is analysis, not an official statistic.",
      },
    ],
    correctionPolicy: {
      reviewedAt: "2026-09-10",
      contact: "info@floridanomics.com",
      commitment:
        "Material errors are corrected promptly, the affected claim is re-sourced, and a dated correction note is retained with the product record.",
    },
  };
}

async function readExistingDataset(): Promise<DashboardDataset | null> {
  try {
    const raw = await readFile(OUTPUT_FILE, "utf8");
    return JSON.parse(raw) as DashboardDataset;
  } catch {
    return null;
  }
}

function getPreservedSections(existing: DashboardDataset | null): PreservedSections {
  if (
    !existing?.scorecard2030 ||
    !existing.competition ||
    !existing.distinctives?.snowbirdIndex ||
    !existing.distinctives?.spaceCoastCadence ||
    !existing.distinctives?.latamGateway ||
    !existing.trade
  ) {
    throw new Error(
      "Existing dataset is missing curated v2 sections. Restore public/data/florida-economy.json from git before refreshing.",
    );
  }

  return {
    scorecard2030: existing.scorecard2030,
    competition: existing.competition,
    distinctives: existing.distinctives,
    trade: existing.trade,
  };
}

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
    seriesId: "LASST120000000000003",
    unit: "percent",
    trendDirection: "down_good",
  },
  {
    id: "laborForce",
    label: "Labor Force",
    seriesId: "LASST120000000000006",
    unit: "persons",
    trendDirection: "up_good",
  },
  {
    id: "employmentLevel",
    label: "Employment Level",
    seriesId: "LASST120000000000005",
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

const PEER_STATE_DEFS = [
  {
    id: "FL",
    name: "Florida",
    shortName: "FL",
    fips: "12",
    positioning: "The scale state with migration, trade, aerospace, and founder formation.",
    watch: "Whether population and income migration convert into high-wage payroll depth.",
  },
  {
    id: "TX",
    name: "Texas",
    shortName: "TX",
    fips: "48",
    positioning: "The capex and power-heavy benchmark for energy, chips, data centers, and advanced manufacturing.",
    watch: "Whether Texas keeps turning infrastructure scale into payroll and wage advantage.",
  },
  {
    id: "GA",
    name: "Georgia",
    shortName: "GA",
    fips: "13",
    positioning: "The logistics, film, auto, battery, and Atlanta talent benchmark.",
    watch: "Whether Georgia keeps converting industrial incentives into high-quality job growth.",
  },
  {
    id: "NC",
    name: "North Carolina",
    shortName: "NC",
    fips: "37",
    positioning: "The county-vitality and research-triangle benchmark for balanced growth.",
    watch: "Whether research, manufacturing, and county momentum stay synchronized.",
  },
  {
    id: "TN",
    name: "Tennessee",
    shortName: "TN",
    fips: "47",
    positioning: "The education-to-employment and advanced manufacturing benchmark.",
    watch: "Whether its talent pipeline keeps pace with industrial project growth.",
  },
  {
    id: "AZ",
    name: "Arizona",
    shortName: "AZ",
    fips: "04",
    positioning: "The semiconductor, data-center, and desert-growth peer.",
    watch: "Whether power, water, and chip capex translate into durable wage gains.",
  },
  {
    id: "UT",
    name: "Utah",
    shortName: "UT",
    fips: "49",
    positioning: "The high-growth, high-participation tech and family-formation peer.",
    watch: "Whether a smaller state can keep outperforming larger talent markets.",
  },
  {
    id: "CA",
    name: "California",
    shortName: "CA",
    fips: "06",
    positioning: "The incumbent innovation economy Florida keeps measuring itself against.",
    watch: "Whether capital and talent leakage continues, or California re-accelerates.",
  },
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
    id: "florida-commerce",
    name: "FloridaCommerce",
    category: "Programs",
    region: "Statewide",
    summary: "Official state commerce agency for workforce, business growth, trade, and economic development signals.",
    url: "https://www.floridajobs.org/",
  },
  {
    id: "florida-governor-press-office",
    name: "Florida Governor's Office",
    category: "Policy",
    region: "Statewide",
    summary: "Official executive announcements for state-backed capital investment and strategic economic development wins.",
    url: "https://www.flgov.com/eog/news/press/",
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
    name: "Florida Council of 100 / Ambition Accelerated",
    category: "Policy",
    region: "Statewide",
    summary: "Business-led competitiveness agenda and national campaign for Florida's next generation of high-growth companies.",
    url: "https://ambitionaccelerated.com/",
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
    id: "florida-taxwatch",
    name: "Florida TaxWatch",
    category: "Policy",
    region: "Statewide",
    summary: "Independent fiscal, taxpayer, and economic research for Florida budget and competitiveness context.",
    url: "https://floridataxwatch.org/",
  },
  {
    id: "james-madison-institute",
    name: "The James Madison Institute",
    category: "Policy",
    region: "Statewide",
    summary: "Florida policy research for economic freedom, regulation, workforce, housing, and competitiveness analysis.",
    url: "https://jamesmadison.org/",
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

const FLORIDA_BRAIN_NOTES: DashboardDataset["brainNotes"] = [
  {
    id: "ai-capex-gap",
    kicker: "Florida Brain note",
    status: "Research brief",
    title: "Florida's position in AI infrastructure investment",
    summary:
      "A review of the evidence needed to assess Florida's data-center investment, infrastructure requirements, and regional economic benefits. State employment figures alone do not establish an investment gap.",
    ctaLabel: "Open the brief",
    href: "briefs/ai-capex-gap/",
    sources: [
      {
        label: "BLS April 2026 state release",
        url: "https://www.bls.gov/news.release/archives/laus_05222026.htm",
      },
      {
        label: "CBRE North America Data Center Trends",
        url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h1-2026/dallas-ft-worth-data-center-market",
      },
    ],
  },
  {
    id: "strategic-compute-not-dumb-load",
    kicker: "Policy read",
    status: "Watch item",
    title: "Data-center investment and infrastructure costs.",
    summary:
      "Florida's enacted CS/CS/SB 484 addresses data-center requirements. Project evaluation also needs evidence on costs, capacity, and local economic benefits.",
    sources: [
      {
        label: "Florida Governor SB 484 release",
        url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-signs-law-protect-floridians-subsidizing-data-centers",
      },
    ],
  },
  {
    id: "florida-shaped-compute-lane",
    kicker: "Industry research",
    status: "Research question",
    title: "Regional demand for computing infrastructure",
    summary:
      "Aerospace, health care, finance, and international business may support demand for computing services. Commercial viability requires project-level analysis.",
    sources: [
      {
        label: "JLL 2026 Global Data Center Outlook",
        url: "https://www.jll.com/en-uk/newsroom/global-data-center-sector-to-nearly-double-to-200gw-amid-ai-infrastructure-boom",
      },
      {
        label: "PortMiami cargo gateway source",
        url: "https://www.miamidade.gov/portmiami/cargo.page",
      },
    ],
  },
];

const STRATEGY_SOURCE_STACK: DashboardDataset["sources"] = [
  {
    id: "texas_comptroller_texstats",
    name: "Texas Comptroller TexStats",
    url: "https://comptroller.texas.gov/transparency/open-data/dashboards.php",
    notes: "Peer dashboard model for official statewide and regional economic indicators.",
  },
  {
    id: "texas_2036_data_hub",
    name: "Texas 2036 Data Hub",
    url: "https://texas2036.org/data/",
    notes: "Long-range state strategy and scenario framing model.",
  },
  {
    id: "pennsylvania_on_target",
    name: "Pennsylvania On Target",
    url: "https://dced.pa.gov/pennsylvania-on-target/",
    notes: "Cluster, workforce, supply-chain, and emerging-industry dashboard model.",
  },
  {
    id: "north_carolina_evi",
    name: "North Carolina County Economic Vitality Dashboard",
    url: "https://www.commerce.nc.gov/news/the-lead-feed/introducing-county-evi-dashboard",
    notes: "County comparison, ranking, and improvement-over-time model.",
  },
  {
    id: "tennessee_e2e",
    name: "Tennessee Education to Employment Dashboard",
    url: "https://www.tn.gov/finance/oei/tn-data/e2e-dashboard.html",
    notes: "Education-program to wage-outcome model for talent pipeline analysis.",
  },
  {
    id: "washington_stem_dashboard",
    name: "Washington STEM Talent Supply and Demand Dashboard",
    url: "https://wsac.wa.gov/STEM-Alliance",
    notes: "STEM supply-demand model for workforce gap framing.",
  },
  {
    id: "mass_competitiveness_index",
    name: "Massachusetts Competitiveness Index",
    url: "https://www.masstaxpayers.org/massachusetts-competitiveness-index-2025",
    notes: "Peer-state competitiveness model across economic health, population, business investment, and quality of life.",
  },
];

const TERMINAL_SOURCE_STACK: DashboardDataset["sources"] = [
  {
    id: "bls_state_april_2026",
    name: "BLS State Employment and Unemployment, April 2026",
    url: "https://www.bls.gov/news.release/laus.nr0.htm",
    notes: "Official state unemployment and nonfarm payroll benchmark used for the Florida versus peer-state operating read.",
  },
  {
    id: "cbre_h2_2025_data_centers",
    name: "CBRE North America Data Center Trends H2 2025",
    url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h1-2026/dallas-ft-worth-data-center-market",
    notes: "Industry source for primary-market net absorption, Dallas data-center demand, supply constraints, and AI inference siting trends.",
  },
  {
    id: "jll_2026_global_data_center_outlook",
    name: "JLL 2026 Global Data Center Outlook",
    url: "https://www.jll.com/en-uk/newsroom/global-data-center-sector-to-nearly-double-to-200gw-amid-ai-infrastructure-boom",
    notes: "Industry source for the global AI infrastructure supercycle, 103 GW to 200 GW capacity outlook, and $3T investment frame.",
  },
  {
    id: "florida_governor_sb484",
    name: "Florida Governor's Office - SB 484 Data Center Law",
    url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-signs-law-protect-floridians-subsidizing-data-centers",
    notes: "Official source for Florida's ratepayer-protection stance on hyperscale data centers.",
  },
  {
    id: "florida_senate_sb484",
    name: "Florida Senate CS/CS/SB 484 Bill Summary",
    url: "https://www.flsenate.gov/Committees/BillSummaries/2026/html/484",
    notes: "Policy source for large-load tariff, cost-of-service, local authority, water, and transparency requirements.",
  },
];

const STRATEGY_BENCHMARK_EXAMPLES: StrategyLayer["benchmarkExamples"] = [
  {
    id: "texas-2036",
    name: "Texas 2036",
    model: "State futures",
    takeaway: "Make the dashboard answer where the state is headed, not just what happened last month.",
    source: {
      label: "Texas 2036 Data Hub",
      url: "https://texas2036.org/data/",
    },
  },
  {
    id: "pennsylvania-on-target",
    name: "Pennsylvania On Target",
    model: "Cluster strategy",
    takeaway: "Organize growth around sectors, supply chains, workforce gaps, and emerging industries.",
    source: {
      label: "Pennsylvania On Target",
      url: "https://dced.pa.gov/pennsylvania-on-target/",
    },
  },
  {
    id: "north-carolina-evi",
    name: "North Carolina EVI",
    model: "County momentum",
    takeaway: "Rank local momentum so statewide leaders can see where growth is broadening or narrowing.",
    source: {
      label: "NC County Economic Vitality",
      url: "https://www.commerce.nc.gov/news/the-lead-feed/introducing-county-evi-dashboard",
    },
  },
  {
    id: "tennessee-e2e",
    name: "Tennessee E2E",
    model: "Talent pipeline",
    takeaway: "Tie degrees and credentials to jobs and wage outcomes, not just enrollment.",
    source: {
      label: "Tennessee E2E Dashboard",
      url: "https://www.tn.gov/finance/oei/tn-data/e2e-dashboard.html",
    },
  },
  {
    id: "mass-competitiveness",
    name: "Massachusetts Competitiveness Index",
    model: "Peer-state scoreboard",
    takeaway: "Put Florida in the ring with competitor states across business, labor, migration, and quality-of-life metrics.",
    source: {
      label: "Massachusetts Competitiveness Index",
      url: "https://www.masstaxpayers.org/massachusetts-competitiveness-index-2025",
    },
  },
];

const STRATEGY_CLUSTERS: StrategyLayer["clusters"] = [
  {
    id: "ai-power-readiness",
    title: "AI capex and power readiness",
    thesis: "Florida's AI infrastructure position requires comparable evidence on data-center capacity, power availability, project investment, and employment.",
    bottleneck: "Power supply, water, transmission, and the allocation of infrastructure costs.",
    proof: "State unemployment rates alone cannot establish whether Florida is gaining or losing AI infrastructure investment.",
    whatToTrack: "Data-center megawatts, interconnection queue, industrial power rates, project capex, and high-wage construction plus operations jobs.",
    sources: [
      {
        label: "Florida Brain AI capex brief",
        url: "https://www.floridanomics.com/briefs/ai-capex-gap/",
      },
      {
        label: "CBRE data center trends",
        url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h1-2026/dallas-ft-worth-data-center-market",
      },
    ],
  },
  {
    id: "space-coast-aerospace",
    title: "Space Coast aerospace cadence",
    thesis: "Florida's aerospace capabilities connect launch operations, manufacturing, engineering, and spaceport infrastructure.",
    bottleneck: "Specialized talent, industrial sites, supplier depth, and how much of the value chain stays in Florida.",
    proof: "Space Florida's 2025 review reported 109 launches and a $6 billion prospective project pipeline. The $600 million Blue Origin expansion was announced in May 2026.",
    whatToTrack: "Launch cadence, aerospace payrolls, project pipeline, supplier announcements, and advanced manufacturing wage growth.",
    sources: [
      {
        label: "Space Florida",
        url: "https://www.spaceflorida.gov/news/space-florida-drives-major-wins-for-the-global-aerospace-industry",
      },
    ],
  },
  {
    id: "latam-gateway",
    title: "LATAM gateway and logistics",
    thesis: "South Florida's trade capabilities connect ports and airports with logistics, finance, and business services.",
    bottleneck: "Cold-chain capacity, port throughput, customs efficiency, insurance, and last-mile infrastructure.",
    proof: "PortMiami and Port Everglades publish cargo statistics that provide dated measures of regional freight activity.",
    whatToTrack: "TEUs, tonnage, refrigerated cargo, LATAM share, air cargo, export categories, and bilateral trade via Florida ports and airports.",
    sources: [
      {
        label: "PortMiami cargo",
        url: "https://www.miamidade.gov/portmiami/cargo.page",
      },
      {
        label: "Port Everglades cargo",
        url: "https://www.porteverglades.net/about-us/statistics/cargo-statistics/",
      },
    ],
  },
  {
    id: "talent-pipeline",
    title: "Talent pipeline and wage outcomes",
    thesis: "Industry development depends on education, skills, and employer demand aligning across Florida's regional labor markets.",
    bottleneck: "The first Talent Match view covers selected public-university bachelor's pathways; state-college, private, certificate, graduate, migration, and employer-demand layers remain outside the proxy.",
    proof: "The selected pathways combine historical graduate outcomes with long-term occupational projections. They are incomplete measures of labor supply and demand.",
    whatToTrack: "Broader credentials, regional placement, retention, target occupations, wage outcomes, and employer demand in priority clusters.",
    sources: [
      {
        label: "Tennessee E2E",
        url: "https://www.tn.gov/finance/oei/tn-data/e2e-dashboard.html",
      },
      {
        label: "Washington STEM",
        url: "https://wsac.wa.gov/STEM-Alliance",
      },
    ],
  },
];

const STRATEGY_TALENT_PIPELINE: StrategyLayer["talentPipeline"] = {
  eyebrow: "Talent pipeline layer",
  title: "Education, employment, and wage outcomes.",
  summary:
    "Selected public-university programs illustrate the relationship between credentials and observed Florida employment. Coverage and reporting periods are stated in the Talent section.",
  stats: [
    {
      label: "Model to steal",
      value: "Tennessee E2E",
      context: "Education programs linked to employment and wages one to five years after graduation",
      source: {
        label: "Tennessee E2E Dashboard",
        url: "https://www.tn.gov/finance/oei/tn-data/e2e-dashboard.html",
      },
    },
    {
      label: "Supply-demand model",
      value: "Washington STEM",
      context: "STEM talent supply measured against workforce demand",
      source: {
        label: "Washington STEM Dashboard",
        url: "https://wsac.wa.gov/STEM-Alliance",
      },
    },
    {
      label: "Florida target",
      value: "Cluster fit",
      context: "Degrees, credentials, jobs, and wages mapped to aerospace, AI, logistics, life sciences, and fintech",
      source: {
        label: "FC100 Ambition Accelerated",
        url: "https://ambitionaccelerated.com/",
      },
    },
  ],
  interpretation: [
    "Workforce planning requires evidence on relevant skills, graduate outcomes, and employer demand within each region.",
    "These comparisons cover a limited set of bachelor's programs. They exclude many other sources of qualified workers.",
  ],
  sources: [
    {
      label: "Tennessee Education to Employment Dashboard",
      url: "https://www.tn.gov/finance/oei/tn-data/e2e-dashboard.html",
    },
    {
      label: "Washington STEM Talent Supply and Demand Dashboard",
      url: "https://wsac.wa.gov/STEM-Alliance",
    },
    {
      label: "Florida Council of 100 / Ambition Accelerated",
      url: "https://ambitionaccelerated.com/",
    },
  ],
};

const STRATEGY_SCENARIOS: StrategyLayer["scenarios"] = [
  {
    id: "base",
    label: "Base case",
    status: "Current trajectory",
    summary: "Florida keeps gaining people, income, and company formation, but high-wage cluster depth grows unevenly.",
    signals: [
      "Labor force keeps expanding while unemployment stays elevated from recent lows.",
      "Business applications increase while information-sector employment follows a different trend.",
      "Trade and aerospace carry distinctive strength, but AI infrastructure remains under-measured.",
    ],
    sources: [
      {
        label: "BLS",
        url: "https://www.bls.gov/developers/",
      },
      {
        label: "Florida Scorecard",
        url: "https://thefloridascorecard.org/pillar%26c%3D0%26pillar%3D2",
      },
    ],
  },
  {
    id: "ambition",
    label: "Ambition case",
    status: "Florida wins strategic compute",
    summary: "Illustrative scenario: additional investment in AI, aerospace, logistics, life sciences, and business services, with project-specific infrastructure costs covered.",
    signals: [
      "Data-center and grid investments show up as high-wage construction and operations jobs.",
      "Space Coast suppliers deepen the aerospace value chain inside Florida.",
      "Talent pipeline data begins showing cluster-specific wage and placement gains.",
    ],
    sources: [
      {
        label: "Texas 2036 scenario model",
        url: "https://texas2036.org/data/",
      },
      {
        label: "Florida Brain AI capex brief",
        url: "https://www.floridanomics.com/briefs/ai-capex-gap/",
      },
    ],
  },
  {
    id: "risk",
    label: "Risk case",
    status: "Population growth without next-economy depth",
    summary: "Florida keeps the migration story but misses too much of the power-heavy capex and STEM employment boom.",
    signals: [
      "Unemployment rises while payroll growth concentrates in lower-wage or population-serving sectors.",
      "Texas, Georgia, Arizona, and North Carolina absorb more industrial and data-center investment.",
      "Employment and wage gains fall short of the state's industry-development ambitions.",
    ],
    sources: [
      {
        label: "Massachusetts peer-state model",
        url: "https://www.masstaxpayers.org/massachusetts-competitiveness-index-2025",
      },
      {
        label: "Pennsylvania cluster model",
        url: "https://dced.pa.gov/pennsylvania-on-target/",
      },
    ],
  },
];

const TERMINAL_LAYER: Omit<TerminalLayer, "projectLedger" | "governmentGrantsLedger"> = {
  headline: "Investment, infrastructure, and Florida's economic development.",
  thesis:
    "Population growth, business applications, infrastructure, and industry investment each contribute to Florida's economy. The practical question is how these strengths support productivity, wage growth, and durable regional employment.",
  operatingQuestion:
    "Where can Florida's existing capabilities support additional investment, and what constraints must be addressed?",
  sources: [
    {
      id: "bls_state_april_2026",
      label: "BLS April 2026 state release",
      url: "https://www.bls.gov/news.release/laus.nr0.htm",
      tier: "official",
      note: "Florida posted the largest monthly payroll gain in April 2026, while its unemployment rate rose 1.1 percentage points year over year.",
    },
    {
      id: "cbre_h2_2025_data_centers",
      label: "CBRE H1 2026 Dallas-Fort Worth data-center market",
      url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h1-2026/dallas-ft-worth-data-center-market",
      tier: "industry",
      note: "Tracks primary-market absorption, Dallas momentum, power constraints, inference demand, and the national incentive race.",
    },
    {
      id: "jll_2026_global_data_center_outlook",
      label: "JLL 2026 global data center outlook",
      url: "https://www.jll.com/en-uk/newsroom/global-data-center-sector-to-nearly-double-to-200gw-amid-ai-infrastructure-boom",
      tier: "industry",
      note: "Frames the global AI infrastructure supercycle as capacity moving from 103 GW to 200 GW by 2030 with up to $3T of investment.",
    },
    {
      id: "florida_governor_sb484",
      label: "Florida Governor SB 484 release",
      url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-signs-law-protect-floridians-subsidizing-data-centers",
      tier: "official",
      note: "Official ratepayer-protection and local-authority frame for Florida data-center policy.",
    },
    {
      id: "florida_senate_sb484",
      label: "Florida Senate SB 484 summary",
      url: "https://www.flsenate.gov/Committees/BillSummaries/2026/html/484",
      tier: "policy",
      note: "Large-load customers must pay cost of service and cannot shift nonpayment risk to the general body of ratepayers.",
    },
    {
      id: "space_florida",
      label: "Space Florida aerospace readout",
      url: "https://www.spaceflorida.gov/news/space-florida-drives-major-wins-for-the-global-aerospace-industry",
      tier: "official",
      note: "Source for launch cadence and aerospace project-pipeline context.",
    },
    {
      id: "blue_origin_florida",
      label: "Blue Origin Florida expansion",
      url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-announces-600m-blue-origin-manufacturing-expansion-500-high",
      tier: "official",
      note: "Project-level source for the $600M Cape Canaveral manufacturing expansion and 500 high-wage jobs frame.",
    },
    {
      id: "saronic_port_alpha",
      label: "Saronic Port Alpha announcement",
      url: "https://www.prnewswire.com/news-releases/saronic-to-build-port-alpha-americas-next-generation-shipyard-in-brownsville-texas-302827950.html",
      tier: "industry",
      note: "Company announcement for the $3B-plus Brownsville shipyard, construction timeline, and up to 10,000 direct jobs.",
    },
    {
      id: "nc_jetzero_groundbreaking",
      label: "North Carolina JetZero groundbreaking",
      url: "https://www.commerce.nc.gov/news/press-releases/2026/06/15/governor-stein-celebrates-jetzero-groundbreaking-launch-greensboro-airplane-makers-14500-job-project",
      tier: "official",
      note: "Official source for the $4.7B Greensboro aerospace project, 14,500-job commitment, and construction milestone.",
    },
    {
      id: "nc_abbvie_durham",
      label: "North Carolina AbbVie Durham announcement",
      url: "https://www.commerce.nc.gov/news/press-releases/2026/04/22/governor-stein-announces-abbvie-build-new-14-billion-manufacturing-campus-durham",
      tier: "official",
      note: "Official source for AbbVie's $1.4B Durham campus, 734 jobs, and $118,041 disclosed average salary.",
    },
    {
      id: "ga_ucb_biologics",
      label: "Georgia UCB biologics announcement",
      url: "https://georgia.org/press-releases/2026/ucb-invest-2-billion-georgia-establish-first-us-manufacturing-facility",
      tier: "official",
      note: "Official source for UCB's $2B biologics manufacturing facility and 330 jobs at Rowen.",
    },
    {
      id: "ga_unified_legacy",
      label: "Georgia Unified Legacy announcement",
      url: "https://georgia.org/press-releases/2026/georgia-based-unified-legacy-create-500-new-jobs-macon-bibb-county",
      tier: "official",
      note: "Official source for the $125M Macon precision-manufacturing facility and 500 jobs.",
    },
    {
      id: "pa_defense_summit_2026",
      label: "2026 Pennsylvania Defense and Innovation Summit",
      url: "https://www.mccormick.senate.gov/news/press-releases/senator-mccormick-announces-nearly-10-billion-in-new-investment-supporting-4000-pennsylvania-jobs-at-2026-pennsylvania-defense-and-innovation-summit-2/",
      tier: "official",
      note: "Official project list used to separate countable facility investment from contracts, orders, and strategic agreements.",
    },
    {
      id: "dol_apprenticeship_awards_2026",
      label: "U.S. DOL apprenticeship incentive awards",
      url: "https://www.dol.gov/newsroom/releases/eta/eta20260707",
      tier: "official",
      note: "Federal announcement for five cooperative agreements totaling nearly $162M, including FloridaCommerce's $40M award.",
    },
    {
      id: "dol_training_fund_tegl_02_25_change_1",
      label: "U.S. DOL Training Fund, TEGL 02-25 Change 1",
      url: "https://www.dol.gov/agencies/eta/advisories/tegl-02-25-change-1",
      tier: "official",
      note: "Official $40M national funding opportunity, including at least $5M for shipbuilding training; tracked as an opportunity rather than a Florida award.",
    },
    {
      id: "floridacommerce_dol_40m_2026",
      label: "FloridaCommerce $40M apprenticeship award",
      url: "https://floridajobs.org/news-center/DEO-Press/2026/07/08/u.s.-department-of-labor-awards--40-million-to-expand-registered-apprenticeships-in-florida",
      tier: "official",
      note: "Florida announcement for the defense, shipbuilding, and maritime manufacturing apprenticeship cooperative agreement.",
    },
    {
      id: "fl_job_growth_mar3_2026",
      label: "Florida Job Growth awards: aerospace and shipbuilding",
      url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-awards-more-13-million-infrastructure-development-through",
      tier: "official",
      note: "Recipient-level source for Bay County, Port St. Joe, and Gulf County infrastructure awards.",
    },
    {
      id: "fl_job_growth_mar6_2026",
      label: "Florida Job Growth awards: Bradford and Nassau",
      url: "https://www.floridajobs.org/news-center/DEO-Press/2026/03/06/icymi--governor-ron-desantis-awards-more-than--9-million-for-workforce-and-infrastructure-development-and-announces-nassau-county-as-a-north-central-florida-rural-area-of-opportunity",
      tier: "official",
      note: "Recipient-level source for Bradford County workforce and Nassau County industrial-site infrastructure awards.",
    },
    {
      id: "fl_resilience_ian_may2026",
      label: "FloridaCommerce Hurricane Ian recovery awards",
      url: "https://www.floridajobs.org/news-center/DEO-Press/2026/05/20/floridacommerce-awards-more-than--10-million-for-hurricane-ian-recovery",
      tier: "official",
      note: "Recipient-level CDBG-DR resilience awards administered by FloridaCommerce.",
    },
    {
      id: "nsf_florida_semiconductor_engine",
      label: "NSF Florida Semiconductor Engine portfolio",
      url: "https://www.nsf.gov/funding/initiatives/regional-innovation-engines/portfolio/florida-semiconductor-engine",
      tier: "official",
      note: "Official program profile for geography, partners, talent coverage, and documented follow-on capital.",
    },
    {
      id: "nsf_award_2315320",
      label: "NSF award 2315320",
      url: "https://www.nsf.gov/awardsearch/showAward?AWD_ID=2315320",
      tier: "official",
      note: "Federal award record used for recipient, period of performance, assistance listing, and current obligations.",
    },
    {
      id: "fl_budget_fy2627",
      label: "Florida FY 2026-27 budget signing",
      url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-signs-florida-fiscal-year-2026-2027-budget-capping-eight",
      tier: "official",
      note: "Appropriation context used to keep program capacity separate from named awards.",
    },
    {
      id: "fl_defense_grant_cycle_2026",
      label: "Florida defense grant application cycle",
      url: "https://floridajobs.org/news/detail/2026/06/10/floridacommerce-announces-opening-of-application-cycle-for-defense-reinvestment-grant-and-florida-defense-support-commission-grant-programs",
      tier: "official",
      note: "Open-opportunity context; no recipient award is counted from the application announcement.",
    },
    {
      id: "fsu_caps_navsea_2026",
      label: "FSU CAPS NAVSEA contract",
      url: "https://news.fsu.edu/news/science-technology/2026/07/15/fsu-research-center-secures-88m-navy-contract-to-support-development-of-future-naval-ship-power-systems/",
      tier: "official",
      note: "Contract context used to prevent procurement revenue from being classified as grant assistance.",
    },
    {
      id: "tx_tsif_program",
      label: "Texas Semiconductor Innovation Fund",
      url: "https://gov.texas.gov/business/page/tsif",
      tier: "official",
      note: "Program authority and appropriation context for Texas's standing semiconductor finance tool.",
    },
    {
      id: "tx_tsif_samsung",
      label: "Texas TSIF award to Samsung",
      url: "https://gov.texas.gov/news/post/governor-abbott-announces-texas-semiconductor-innovation-fund-grant-to-samsung-austin-semiconductor",
      tier: "official",
      note: "Recipient-level source for the $250M grant and $4.73B company investment.",
    },
    {
      id: "tx_tsif_coherent",
      label: "Texas TSIF award to Coherent",
      url: "https://gov.texas.gov/news/post/governor-abbott-announces-texas-semiconductor-innovation-fund-grant-to-coherent",
      tier: "official",
      note: "Recipient-level source for the $14.076M grant and more than $154M company investment.",
    },
    {
      id: "tx_tsif_arm",
      label: "Texas TSIF award to Arm",
      url: "https://gov.texas.gov/news/post/governor-abbott-announces-texas-semiconductor-innovation-fund-grant-to-arm-inc",
      tier: "official",
      note: "Recipient-level source for the $4.163M grant, company investment, and jobs commitment.",
    },
    {
      id: "tx_tsif_ltd",
      label: "Texas TSIF award to LTD Material",
      url: "https://gov.texas.gov/news/post/governor-abbott-announces-texas-semiconductor-innovation-fund-grant-to-ltd-material",
      tier: "official",
      note: "Recipient-level source for the $1.007M supplier grant, company investment, and jobs commitment.",
    },
    {
      id: "tx_tsif_tstc",
      label: "Texas TSIF award to Texas State Technical College",
      url: "https://gov.texas.gov/news/post/governor-abbott-announces-texas-semiconductor-innovation-fund-grant-to-texas-state-technical-college",
      tier: "official",
      note: "Recipient-level source for the $3.5M accelerated semiconductor technician-training award.",
    },
    {
      id: "portmiami",
      label: "PortMiami cargo statistics",
      url: "https://www.miamidade.gov/portmiami/cargo.page",
      tier: "official",
      note: "Official gateway metrics for tonnage, TEUs, and Americas trade capacity.",
    },
    {
      id: "port_everglades",
      label: "Port Everglades cargo statistics",
      url: "https://www.porteverglades.net/about-us/statistics/cargo-statistics/",
      tier: "official",
      note: "Official cargo and refrigerated-container metrics for the South Florida logistics layer.",
    },
    {
      id: "fc100_ambition_accelerated",
      label: "Florida Council of 100 Ambition Accelerated",
      url: "https://ambitionaccelerated.com/",
      tier: "benchmark",
      note: "Business-led ambition frame for Florida's next-economy strategy.",
    },
    {
      id: "florida_chamber_income_migration",
      label: "Florida Chamber income migration analysis",
      url: "https://www.flchamber.com/breaking-news-income-migration-to-florida-remains-above-4m-per-hour-significantly-more-than-any-other-state/",
      tier: "benchmark",
      note: "Historical Chamber migration analysis; superseded by the dated figures in the migration section.",
    },
    {
      id: "florida_taxwatch",
      label: "Florida TaxWatch",
      url: "https://floridataxwatch.org/",
      tier: "policy",
      note: "Florida fiscal and competitiveness research source for future policy memos.",
    },
    {
      id: "james_madison_institute",
      label: "James Madison Institute",
      url: "https://jamesmadison.org/",
      tier: "policy",
      note: "Florida economic-freedom and regulatory-policy source for future policy memos.",
    },
  ],
  aiCapexIndex: {
    label: "AI Capex Gap Index",
    score: 15,
    maxScore: 25,
    rating: "Watch",
    caveat:
      "Historical editorial assessment, not a measured investment gap or an official rating. A complete Florida capacity inventory and comparable project-level evidence are still needed.",
    metrics: [
      {
        id: "florida-payroll-jump",
        label: "Florida payroll pulse",
        value: "+40,500",
        context: "April 2026 monthly nonfarm payroll change, largest among states",
        read: "Monthly payroll change measures jobs across the economy. It does not identify the contribution of AI infrastructure.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "florida-unemployment-watch",
        label: "Unemployment warning light",
        value: "4.8%",
        context: "Florida April 2026 unemployment rate, up 1.1 percentage points year over year",
        read: "Unemployment and payrolls describe different populations. Industry detail is needed to understand their respective movements.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "texas-peer-spread",
        label: "Texas comparison",
        value: "4.3%",
        context: "Texas April 2026 unemployment rate",
        read: "Texas provides a peer comparison. Differences in unemployment cannot be attributed to data centers from these figures alone.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "dallas-absorption",
        label: "Dallas data centers under construction",
        value: "765+ MW",
        context: "CBRE H1 2026 Dallas-Fort Worth market review",
        read: "CBRE reports more than 765 MW under construction, with 95% preleased. Construction capacity differs from operating supply and planned projects.",
        sourceIds: ["cbre_h2_2025_data_centers"],
      },
      {
        id: "global-ai-supercycle",
        label: "Global data-center investment forecast",
        value: "$3T",
        context: "JLL estimate for total data-center investment over the next five years",
        read: "This global industry forecast describes potential investment, not committed Florida capital.",
        sourceIds: ["jll_2026_global_data_center_outlook"],
      },
    ],
    factors: [
      {
        id: "demand-adjacency",
        label: "Demand adjacency",
        score: 4,
        maxScore: 5,
        read: "Potential demand includes aerospace, finance, health care, and regional digital services. Project demand requires individual verification.",
        sourceIds: ["jll_2026_global_data_center_outlook", "portmiami", "space_florida"],
      },
      {
        id: "power-readiness",
        label: "Power readiness",
        score: 2,
        maxScore: 5,
        read: "Comparable evidence is needed on capacity under construction, interconnection, power procurement, and self-supply.",
        sourceIds: ["cbre_h2_2025_data_centers", "florida_senate_sb484"],
      },
      {
        id: "project-visibility",
        label: "Project visibility",
        score: 2,
        maxScore: 5,
        read: "The current inventory is incomplete. Missing records do not establish that projects or investment are absent.",
        sourceIds: ["blue_origin_florida", "cbre_h2_2025_data_centers"],
      },
      {
        id: "incentive-discipline",
        label: "Incentive discipline",
        score: 4,
        maxScore: 5,
        read: "Evaluate cost allocation, utility requirements, local approvals, and economic benefits against the enacted law and project terms.",
        sourceIds: ["florida_governor_sb484", "florida_senate_sb484"],
      },
      {
        id: "wage-conversion",
        label: "High-wage conversion",
        score: 3,
        maxScore: 5,
        read: "Wages, occupations, and employment outcomes help assess whether investment is supporting higher-productivity activities.",
        sourceIds: ["bls_state_april_2026", "fc100_ambition_accelerated"],
      },
    ],
  },
  highWageMonitor: {
    headline: "Employment composition and wage outcomes.",
    summary:
      "These broad sector measures provide context for industry development. They do not isolate AI-related jobs, establish wage quality, or measure the effects of individual investments.",
    metrics: [
      {
        id: "information-jobs",
        label: "Information jobs",
        value: "Live BLS series",
        context: "Information-sector employment",
        read: "Information employment covers multiple industries. It is not a comprehensive count of technology or data-center jobs.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "construction-jobs",
        label: "Construction jobs",
        value: "Live BLS series",
        context: "Construction-sector employment",
        read: "Construction employment spans residential, commercial, and infrastructure work. Project-level data are needed to attribute changes.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "professional-services",
        label: "Professional services",
        value: "Live BLS series",
        context: "Professional and business services",
        read: "Professional and business services include engineering, management, administrative, and other activities with varied wages.",
        sourceIds: ["bls_state_april_2026"],
      },
    ],
  },
  forecasts: [
    {
      id: "ai-capex-gap",
      claim:
        "Research question: how much AI infrastructure investment is Florida attracting relative to comparable states?",
      horizon: "6 to 18 months",
      confidence: "medium",
      mechanism:
        "Data-center projects may generate construction, engineering, utility, and operating activity. Their contribution must be established from project-level capacity, spending, employment, and cost data.",
      leadingIndicators: [
        "Announced megawatts and MW under construction by state",
        "Large-load interconnection queue and utility tariff filings",
        "Hyperscaler, neocloud, and colocation capex announcements",
        "Construction, electrical-contractor, and utility-workforce demand",
      ],
      laggingIndicators: [
        "Information employment",
        "Construction payrolls",
        "Professional and business services payrolls",
        "Average weekly wages in target clusters",
      ],
      baseCase:
        "Illustrative scenario: established industries continue to account for most documented regional investment.",
      ambitionCase:
        "Illustrative scenario: commercially viable compute projects add capacity while covering their infrastructure costs and supporting regional demand.",
      riskCase:
        "Illustrative scenario: infrastructure constraints delay viable projects or increase their costs.",
      counterCase:
        "Labor-market changes may reflect participation, industry composition, and broader conditions rather than AI investment.",
      updateTrigger:
        "Reassess when comparable project-capacity inventories and utility filings are available. No causal finding is established here.",
      sourceIds: ["bls_state_april_2026", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "florida-model-export",
      claim:
        "Research question: which Florida economic-development practices are transferable to other regions?",
      horizon: "12 to 36 months",
      confidence: "medium",
      mechanism:
        "Policy comparisons require evidence on institutions, costs, industry composition, and outcomes. Florida's geographic and demographic advantages may not transfer.",
      leadingIndicators: [
        "Business formation",
        "Income migration",
        "Cluster project ledger",
        "Workforce placement into target sectors",
      ],
      laggingIndicators: [
        "GDP per capita",
        "Median wage growth",
        "Target-cluster wage premium",
        "State and local fiscal resilience",
      ],
      baseCase:
        "Illustrative scenario: evidence supports selected practices under comparable local conditions.",
      ambitionCase:
        "Illustrative scenario: documented improvements in investment delivery and workforce outcomes inform other jurisdictions.",
      riskCase:
        "Policies are adopted without accounting for differences in local conditions or implementation capacity.",
      counterCase:
        "Geography, climate, migration, and industry structure may explain outcomes that are incorrectly attributed to policy.",
      updateTrigger:
        "Reassess after comparable outcome studies become available.",
      sourceIds: ["florida_chamber_income_migration", "fc100_ambition_accelerated", "florida_taxwatch", "james_madison_institute"],
    },
  ],
  policyMemos: [
    {
      id: "strategic-compute-not-dumb-load",
      title: "Data-center investment and infrastructure costs.",
      stance:
        "Editorial recommendation: assess viable data-center investment alongside ratepayer protection and local infrastructure requirements.",
      whatChanged:
        "CS/CS/SB 484 became Chapter 2026-65. Its principal effective date is July 1, 2026, with exceptions identified in the law.",
      mechanism:
        "Project evaluation should distinguish private investment benefits from electricity, water, and infrastructure costs borne by other customers.",
      recommendation:
        "Assess power procurement, water use, grid requirements, cost recovery, and employment commitments for each proposal. Any incentives should have explicit terms and measurable public benefits.",
      whatNotToDo:
        "Do not infer public benefits from announced spending alone or assume all data centers have the same costs and operating requirements.",
      nextMoves: [
        "Add Florida-specific MW pipeline and utility tariff tracker",
        "Create a named project ledger for data centers, grid upgrades, and advanced manufacturing",
        "Map strategic workloads to Space Coast, LATAM, health, finance, and emergency-resilience use cases",
      ],
      sourceIds: ["florida_governor_sb484", "florida_senate_sb484", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "wage-curve-scoreboard",
      title: "Make wage quality the referee.",
      stance:
        "Editorial recommendation: evaluate industry policy using wages, productivity, and sustained employment alongside investment totals.",
      whatChanged:
        "The latest employment figures differ by industry and measure. Aggregate growth does not establish the quality of individual jobs.",
      mechanism:
        "Population affects demand. Capital investment can support productive capacity, but outcomes depend on project type, implementation, and workforce capabilities.",
      recommendation:
        "Use occupational wages, QCEW industry data, credentials, and regional employment outcomes to assess progress.",
      whatNotToDo:
        "Do not substitute business applications, migration-related income, or announced jobs for measured wage outcomes.",
      nextMoves: [
        "Add high-wage occupation basket by cluster",
        "Track target-cluster wages versus state median",
        "Connect education programs and credentials to employment outcomes",
      ],
      sourceIds: ["bls_state_april_2026", "fc100_ambition_accelerated", "florida_taxwatch", "james_madison_institute"],
    },
  ],
  evidenceBlocks: [
    {
      id: "exportable-model",
      title: "The exportable Florida model",
      briefCopy:
        "Florida's economic development depends on the interaction of population, investment, infrastructure, and skills. Their contribution should be assessed through employment, wages, and productivity.",
      exportUse:
        "Use with the current labor, population, and industry sources.",
      sourceIds: ["florida_chamber_income_migration", "fc100_ambition_accelerated"],
    },
    {
      id: "ai-capex-question",
      title: "The uncomfortable AI question",
      briefCopy:
        "Florida's AI infrastructure position remains an open research question. An incomplete project inventory cannot establish an investment shortfall.",
      exportUse:
        "Use with a dated, comparable inventory of capacity and project stages.",
      sourceIds: ["bls_state_april_2026", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "discipline-frame",
      title: "The policy discipline frame",
      briefCopy:
        "Project evaluation should identify who pays for infrastructure, who bears risk, and what measurable regional benefits follow.",
      exportUse:
        "Editorial analysis; consult the enacted law and applicable utility decisions.",
      sourceIds: ["florida_governor_sb484", "florida_senate_sb484"],
    },
    {
      id: "physical-innovation",
      title: "Regional infrastructure and industry capabilities",
      briefCopy:
        "Ports, space facilities, university research, and specialized manufacturers support different regional capabilities across Florida.",
      exportUse:
        "Use the atlas and individual public-source profiles for regional context.",
      sourceIds: ["space_florida", "blue_origin_florida", "portmiami", "port_everglades"],
    },
  ],
};


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

  const headline = `Florida payroll employment is ${payrollYoy >= 0 ? "higher" : "lower"} than a year ago; unemployment is ${unemployment.latest.value.toFixed(1)}%.`;

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
      : `The unemployment rate is ${unemployment.latest.value.toFixed(1)}%, up ${unemploymentYoy.toFixed(1)} percentage points over the year.`,
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
    "Payroll jobs and employed residents are different measures. Their trends should be assessed separately.",
    "Industry-level changes show where hiring is expanding or contracting within the statewide total.",
    "Population changes affect demand for housing, services, and infrastructure, but do not by themselves establish business investment or productivity growth.",
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
    headline: "Business applications, sector employment, and output measure different aspects of Florida's economy.",
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
      "Business applications measure filings rather than operating firms or jobs created.",
      "Information and professional-services employment cover broad industries and are not direct measures of AI activity.",
      "Investment decisions also require local evidence on talent, infrastructure, and project delivery.",
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
  strategy?: {
    peerStates?: Array<{
      id: string;
      unemploymentRate?: { sparkline?: TimePoint[] };
      laborForce?: { sparkline?: TimePoint[] };
      nonfarmPayrolls?: { sparkline?: TimePoint[] };
    }>;
  };
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

  const peerMap = new Map((existing.strategy?.peerStates ?? []).map((state) => [state.id, state]));
  for (const state of PEER_STATE_DEFS) {
    const cachedState = peerMap.get(state.id);
    const unemployment = cachedState?.unemploymentRate?.sparkline ?? [];
    const laborForce = cachedState?.laborForce?.sparkline ?? [];
    const payrolls = cachedState?.nonfarmPayrolls?.sparkline ?? [];

    if (unemployment.length > 0) {
      cached[stateLausSeriesId(state.fips, "003")] = unemployment;
    }
    if (laborForce.length > 0) {
      cached[stateLausSeriesId(state.fips, "006")] = laborForce;
    }
    if (payrolls.length > 0) {
      cached[statePayrollSeriesId(state.fips)] = payrolls;
    }
  }

  return cached;
}

async function main() {
  const existingDataset = await readExistingDataset();
  const projectLedger = await readProjectCapexLedger();
  const governmentGrantsLedger = await readGovernmentGrantsLedger();
  const talent = await readTalentMatch();
  const coreSeriesIds = CORE_SERIES.map((series) => series.seriesId);
  const industrySeriesIds = INDUSTRY_SERIES.map((series) => series.seriesId);
  const metroSeriesIds = METRO_DEFS.flatMap((metro) => [
    metricSeriesId(metro.lausRoot, "003"),
    metricSeriesId(metro.lausRoot, "006"),
    metricSeriesId(metro.lausRoot, "005"),
  ]);
  const peerStateSeriesIds = PEER_STATE_DEFS.flatMap((state) => [
    stateLausSeriesId(state.fips, "003"),
    stateLausSeriesId(state.fips, "006"),
    statePayrollSeriesId(state.fips),
  ]);

  const allBlsIds = [...new Set([...coreSeriesIds, ...industrySeriesIds, ...metroSeriesIds, ...peerStateSeriesIds, ...comparisonSeriesIds])];
  let blsData: Record<string, TimePoint[]>;
  try {
    blsData = await fetchBlsSeries(allBlsIds, { startYear: START_YEAR, endYear: END_YEAR });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("daily threshold")) {
      throw error;
    }

    if (!existingDataset) {
      throw new Error("BLS daily threshold reached and no existing dataset was available for cached fallback.", {
        cause: error,
      });
    }

    blsData = buildBlsDataFromExisting(existingDataset);
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
      label: "Real GSP (chained dollars)",
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

  const peerStates: PeerStateSnapshot[] = PEER_STATE_DEFS.map((state) => {
    const unemployment = blsData[stateLausSeriesId(state.fips, "003")] ?? [];
    const laborForce = blsData[stateLausSeriesId(state.fips, "006")] ?? [];
    const payrolls = blsData[statePayrollSeriesId(state.fips)] ?? [];

    if (unemployment.length === 0 || laborForce.length === 0 || payrolls.length === 0) {
      throw new Error(`Missing peer-state benchmark series for ${state.name}`);
    }

    return {
      id: state.id,
      name: state.name,
      shortName: state.shortName,
      positioning: state.positioning,
      watch: state.watch,
      unemploymentRate: {
        latest: latestPoint(unemployment),
        deltas: buildDeltas(unemployment),
        sparkline: lastN(unemployment, 36),
      },
      laborForce: {
        latest: latestPoint(laborForce),
        deltas: buildDeltas(laborForce),
        sparkline: lastN(laborForce, 36),
      },
      nonfarmPayrolls: {
        latest: latestPoint(payrolls),
        deltas: buildDeltas(payrolls),
        sparkline: lastN(payrolls, 36),
      },
      sources: [
        {
          label: "BLS LAUS / CES",
          url: "https://www.bls.gov/developers/",
        },
      ],
    };
  });

  const narrative = buildNarrative({
    metrics,
    strongestGrowers,
    laggards,
  });

  const refreshedAt = new Date().toISOString();
  const preservedSections = getPreservedSections(existingDataset);
  preservedSections.competition.metroComparison = buildMetroComparison(preservedSections.competition.metroComparison, blsData);
  const [leading, benchmarks, releaseInfo] = await Promise.all([
    buildLeadingSection(),
    buildBenchmarksSection(),
    fetchWserReleaseInfo(),
  ]);
  const federal = await buildFederalDataLayer({
    refreshedAt,
    metrics,
    innovationMetrics,
    peerStates,
    trade: preservedSections.trade,
  });
  const dynamicSources: DashboardDataset["sources"] = [
    {
      id: "bls",
      name: "Bureau of Labor Statistics (LAUS + CES)",
      url: "https://www.bls.gov/developers/",
      notes: "Monthly state and metro labor market + payroll employment series.",
    },
    { ...WSER_SOURCE },
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
    {
      id: "federal_data_spine",
      name: "Federal economic series",
      url: "https://www.bls.gov/developers/",
      notes:
        "Source-aware API contract for BLS, Census, BEA, EIA, and IRS feeds, including live status, key requirements, and safe fallbacks.",
    },
  ];
  const trust = buildTrustLayer({ metrics, releaseInfo, existing: existingDataset });

  const dataset: DashboardDataset = {
    // Data-contract safety net: spread the existing dataset first so any curated or
    // future-added top-level section is preserved unless a computed field below
    // explicitly overwrites it. Prevents silent drift/stripping on refresh.
    ...(existingDataset ?? ({} as DashboardDataset)),
    generatedAt: refreshedAt,
    asOfLaborMarket: prettyMonth(metrics.unemploymentRate.latest.date),
    asOfPopulation: String(new Date(metrics.population.latest.date).getUTCFullYear()),
    sources: mergeSources(dynamicSources, existingDataset?.sources ?? [], STRATEGY_SOURCE_STACK, TERMINAL_SOURCE_STACK),
    trust,
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
    brainNotes: FLORIDA_BRAIN_NOTES,
    strategy: {
      headline: "Florida's competitive position.",
      summary:
        "Compare employment, operating costs, industry capabilities, and workforce preparation across Florida and selected peer states. Regional assets and policy scenarios provide context for investment decisions.",
      peerStates,
      benchmarkExamples: STRATEGY_BENCHMARK_EXAMPLES,
      clusters: STRATEGY_CLUSTERS,
      talentPipeline: STRATEGY_TALENT_PIPELINE,
      scenarios: STRATEGY_SCENARIOS,
    },
    talent,
    competition: preservedSections.competition,
    federal,
    terminal: { ...TERMINAL_LAYER, projectLedger, governmentGrantsLedger },
    scorecard2030: preservedSections.scorecard2030,
    distinctives: preservedSections.distinctives,
    trade: preservedSections.trade,
    leading,
    benchmarks,
  };

  reconcileObservations(dataset, existingDataset);
  if (existingDataset && JSON.stringify(normalizeForComparison(existingDataset)) === JSON.stringify(normalizeForComparison(dataset))) {
    dataset.generatedAt = existingDataset.generatedAt;
  }

  assertPublicDataset(dataset);
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  // Minified (no indent): the dashboard fetches this whole payload on load, so the
  // ~240 KB of pretty-print whitespace was pure transfer/parse cost. ~504 KB to ~276 KB.
  await writeFile(OUTPUT_FILE, `${JSON.stringify(dataset)}\n`, "utf8");

  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`As-of labor market: ${dataset.asOfLaborMarket}; population: ${dataset.asOfPopulation}`);
  console.log("Federal data spine: BLS live; Census/BEA/EIA key-aware; IRS download queue.");
  console.log(
    "Preserved curated sections: scorecard2030, brainNotes, strategy, talent, competition, terminal, distinctives, trade.",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
