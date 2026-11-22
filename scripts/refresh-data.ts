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
    ["florida_chamber", "florida_scorecard", "florida_taxwatch", "james_madison", "fc100", "mass_competitiveness", "texas_2036"].some(
      (token) => id.includes(token),
    )
  ) {
    return "advocacy_analysis";
  }

  if (
    // News reports (such as the Reuters Blue Origin story) fall through to industry research.
    ["governor", "selectflorida", "space_florida"].some((token) => id.includes(token))
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
      "on_target",
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
    methodologyVersion: "2026-11-21",
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
      reviewedAt: "2026-11-22",
      contact: "info@floridanomics.com",
      commitment:
        "When we find a material error, we correct it promptly, check the claim against its source again, and keep a dated note of the correction.",
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
    positioning: "The largest of the group for migration, with strengths in trade, aerospace, and new companies.",
    watch: "Whether new residents and their income turn into more high-wage jobs.",
  },
  {
    id: "TX",
    name: "Texas",
    shortName: "TX",
    fips: "48",
    positioning: "The benchmark for large capital projects in energy, chips, data centers, and advanced manufacturing.",
    watch: "Whether Texas keeps turning its infrastructure into more jobs and higher wages.",
  },
  {
    id: "GA",
    name: "Georgia",
    shortName: "GA",
    fips: "13",
    positioning: "The benchmark for logistics, film, autos, batteries, and Atlanta's workforce.",
    watch: "Whether Georgia's industrial incentives keep producing well-paid jobs.",
  },
  {
    id: "NC",
    name: "North Carolina",
    shortName: "NC",
    fips: "37",
    positioning: "The benchmark for growth spread across counties and for the Research Triangle.",
    watch: "Whether research, manufacturing, and county-level growth keep moving together.",
  },
  {
    id: "TN",
    name: "Tennessee",
    shortName: "TN",
    fips: "47",
    positioning: "The benchmark for moving graduates into jobs and for advanced manufacturing.",
    watch: "Whether its workforce training keeps pace with its industrial projects.",
  },
  {
    id: "AZ",
    name: "Arizona",
    shortName: "AZ",
    fips: "04",
    positioning: "The peer for semiconductors, data centers, and fast growth in the desert Southwest.",
    watch: "Whether investment in power, water, and chip plants produces lasting wage gains.",
  },
  {
    id: "UT",
    name: "Utah",
    shortName: "UT",
    fips: "49",
    positioning: "A fast-growing tech state with high labor-force participation and young families.",
    watch: "Whether a smaller state can keep outperforming larger labor markets.",
  },
  {
    id: "CA",
    name: "California",
    shortName: "CA",
    fips: "06",
    positioning: "The established innovation economy Florida is most often compared with.",
    watch: "Whether companies and workers keep leaving, or California's growth picks up again.",
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
    id: "florida-technology-council",
    name: "Florida Technology Council",
    category: "Ecosystem",
    region: "Statewide",
    summary: "Statewide trade association for Florida's science and technology companies, focused on the technology sector's needs and priorities.",
    url: "https://www.fltechcouncil.org/",
  },
  {
    id: "fdisa",
    name: "Florida Digital Infrastructure and Security Alliance (FDISA)",
    category: "Infrastructure",
    region: "Statewide",
    summary: "Nonpartisan Florida coalition of industry, government, and communities for responsible, secure digital infrastructure.",
    url: "https://www.fdisa.org/",
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
      "What it takes to measure Florida's data-center investment, what those projects need from the grid, and what they return to a region. State job figures alone cannot show an investment gap.",
    ctaLabel: "Open the brief",
    href: "briefs/ai-capex-gap/",
    sources: [
      {
        label: "BLS October 2026 state release",
        url: "https://www.bls.gov/news.release/archives/laus_11202026.htm",
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
      "Florida's new law, CS/CS/SB 484, sets requirements for data centers. Judging a project also takes evidence on its costs, its capacity, and what the community gets from it.",
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
      "Florida's aerospace, health care, finance, and international business may all need more computing. Whether a project pays off has to be checked one project at a time.",
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
    notes: "A peer state's public dashboard of official statewide and regional economic indicators.",
  },
  {
    id: "texas_2036_data_hub",
    name: "Texas 2036 Data Hub",
    url: "https://texas2036.org/data/",
    notes: "A model for long-range state strategy and scenarios.",
  },
  {
    id: "pennsylvania_on_target",
    name: "Pennsylvania On Target",
    url: "https://dced.pa.gov/pennsylvania-on-target/",
    notes: "A peer state's public dashboard of clusters, workforce, supply chains, and emerging industries.",
  },
  {
    id: "north_carolina_evi",
    name: "North Carolina County Economic Vitality Dashboard",
    url: "https://www.commerce.nc.gov/news/the-lead-feed/introducing-county-evi-dashboard",
    notes: "A model for comparing counties, ranking them, and tracking their improvement over time.",
  },
  {
    id: "tennessee_e2e",
    name: "Tennessee Education to Employment Dashboard",
    url: "https://www.tn.gov/finance/oei/tn-data/e2e-dashboard.html",
    notes: "A model that links education programs to graduates' wages.",
  },
  {
    id: "washington_stem_dashboard",
    name: "Washington STEM Talent Supply and Demand Dashboard",
    url: "https://wsac.wa.gov/STEM-Alliance",
    notes: "A model that compares the supply of STEM graduates with employer demand.",
  },
  {
    id: "mass_competitiveness_index",
    name: "Massachusetts Competitiveness Index",
    url: "https://www.masstaxpayers.org/massachusetts-competitiveness-index-2025",
    notes: "A model for comparing states on economic health, population, business investment, and quality of life.",
  },
];

const TERMINAL_SOURCE_STACK: DashboardDataset["sources"] = [
  {
    id: "bls_state_april_2026",
    name: "BLS State Employment and Unemployment, latest release",
    url: "https://www.bls.gov/news.release/laus.nr0.htm",
    notes: "The official state unemployment and payroll figures used to compare Florida with peer states.",
  },
  {
    id: "cbre_h2_2025_data_centers",
    name: "CBRE North America Data Center Trends H1 2026",
    url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h1-2026/dallas-ft-worth-data-center-market",
    notes: "Industry research on data-center leasing in the largest markets, demand in Dallas, supply limits, and where AI computing is being sited.",
  },
  {
    id: "jll_2026_global_data_center_outlook",
    name: "JLL 2026 Global Data Center Outlook",
    url: "https://www.jll.com/en-uk/newsroom/global-data-center-sector-to-nearly-double-to-200gw-amid-ai-infrastructure-boom",
    notes: "Industry research that forecasts global data-center capacity growing from 103 GW to 200 GW, with up to $3 trillion of investment.",
  },
  {
    id: "florida_governor_sb484",
    name: "Florida Governor's Office - SB 484 Data Center Law",
    url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-signs-law-protect-floridians-subsidizing-data-centers",
    notes: "The Governor's Office statement of Florida's position on protecting ratepayers from the costs of hyperscale data centers.",
  },
  {
    id: "florida_senate_sb484",
    name: "Florida Senate CS/CS/SB 484 Bill Summary",
    url: "https://www.flsenate.gov/Committees/BillSummaries/2026/html/484",
    notes: "The bill summary, used for the law's rules on large-load tariffs, cost of service, local authority, water, and transparency.",
  },
];

const STRATEGY_BENCHMARK_EXAMPLES: StrategyLayer["benchmarkExamples"] = [
  {
    id: "texas-2036",
    name: "Texas 2036",
    model: "State futures",
    takeaway: "Show where the state is headed as well as what happened last month.",
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
    takeaway: "Rank metros by recent growth so state leaders can see where growth is spreading and where it is narrowing.",
    source: {
      label: "NC County Economic Vitality",
      url: "https://www.commerce.nc.gov/news/the-lead-feed/introducing-county-evi-dashboard",
    },
  },
  {
    id: "tennessee-e2e",
    name: "Tennessee E2E",
    model: "Talent pipeline",
    takeaway: "Tie degrees and credentials to jobs and wages as well as enrollment.",
    source: {
      label: "Tennessee E2E Dashboard",
      url: "https://www.tn.gov/finance/oei/tn-data/e2e-dashboard.html",
    },
  },
  {
    id: "mass-competitiveness",
    name: "Massachusetts Competitiveness Index",
    model: "Peer-state scoreboard",
    takeaway: "Compare Florida with competitor states on business, labor, migration, and quality-of-life measures.",
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
    thesis: "Measuring Florida's position in AI infrastructure takes comparable figures on data-center capacity, available power, project investment, and jobs.",
    bottleneck: "Power supply, water, transmission, and the allocation of infrastructure costs.",
    proof: "State unemployment rates alone cannot show whether Florida is gaining or losing AI infrastructure investment.",
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
    thesis: "Florida's aerospace industry covers launches, manufacturing, engineering, and the spaceports themselves.",
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
    thesis: "South Florida's ports and airports support logistics, trade finance, and business services.",
    bottleneck: "Cold-chain capacity, port throughput, customs efficiency, insurance, and last-mile infrastructure.",
    proof: "PortMiami and Port Everglades publish dated cargo statistics that show how much freight moves through the region.",
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
    thesis: "An industry grows where schools, workers' skills, and employers' needs line up in the same region.",
    bottleneck: "Talent Match covers selected bachelor's programs at public universities so far. State colleges, private schools, certificates, graduate degrees, workers moving in, and employer demand are not yet included.",
    proof: "Each pathway pairs past graduate outcomes with long-term job projections. Together they give an incomplete picture of labor supply and demand.",
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
  eyebrow: "Talent pipeline",
  title: "Education, employment, and wage outcomes.",
  summary:
    "Selected public-university programs show how degrees connect to jobs held in Florida. The Talent section states what is covered and for which years.",
  stats: [
    {
      label: "Model to study",
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
    "Planning a workforce takes evidence on skills, graduate outcomes, and employer demand in each region.",
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
    summary: "Florida keeps gaining residents, income, and new companies, but high-wage industries grow unevenly across the state.",
    signals: [
      "The labor force keeps growing while unemployment stays above its recent lows.",
      "Business applications increase while information-sector employment follows a different trend.",
      "Trade and aerospace are clear strengths. AI infrastructure is still hard to measure.",
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
    summary: "An illustration: more investment in AI, aerospace, logistics, life sciences, and business services, with each project covering its own infrastructure costs.",
    signals: [
      "Data-center and grid investments show up as high-wage construction and operations jobs.",
      "More aerospace suppliers set up on the Space Coast, so more of the work stays in Florida.",
      "Graduate data begins to show higher wages and placement in the target industries.",
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
    status: "Population growth without new industries",
    summary: "Florida keeps attracting residents but misses most of the power-intensive investment and the STEM jobs that come with it.",
    signals: [
      "Unemployment rises while payroll growth concentrates in lower-wage or population-serving sectors.",
      "Texas, Georgia, Arizona, and North Carolina take more of the industrial and data-center investment.",
      "Job and wage gains fall short of the state's goals for its target industries.",
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
    "Population growth, new businesses, infrastructure, and industry investment all add to Florida's economy. The question is whether they raise productivity, wages, and lasting jobs in each region.",
  operatingQuestion:
    "Where can Florida build on what it already has, and what stands in the way?",
  sources: [
    {
      id: "bls_state_april_2026",
      label: "BLS state employment release",
      url: "https://www.bls.gov/news.release/laus.nr0.htm",
      tier: "official",
      note: "The latest monthly state employment and unemployment release from BLS.",
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
      note: "Florida fiscal and competitiveness research source.",
    },
    {
      id: "james_madison_institute",
      label: "James Madison Institute",
      url: "https://jamesmadison.org/",
      tier: "policy",
      note: "Florida economic-freedom and regulatory-policy research source.",
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
        read: "The monthly payroll change counts jobs across the whole economy, so AI infrastructure's share can't be separated out.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "florida-unemployment-watch",
        label: "Unemployment warning light",
        value: "4.8%",
        context: "Florida April 2026 unemployment rate, up 1.1 percentage points year over year",
        read: "Unemployment counts residents and payrolls count jobs, so the two can move differently. It takes industry detail to explain why.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "texas-peer-spread",
        label: "Texas comparison",
        value: "4.3%",
        context: "Texas April 2026 unemployment rate",
        read: "Texas is shown for comparison. Many things move unemployment, so these figures can't tie a difference to data centers.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "dallas-absorption",
        label: "Dallas data centers under construction",
        value: "765+ MW",
        context: "CBRE H1 2026 Dallas-Fort Worth market review",
        read: "CBRE reports more than 765 MW under construction, with 95% preleased. Operating and planned capacity are separate measures.",
        sourceIds: ["cbre_h2_2025_data_centers"],
      },
      {
        id: "global-ai-supercycle",
        label: "Global data-center investment forecast",
        value: "$3T",
        context: "JLL estimate for total data-center investment over the next five years",
        read: "A global industry forecast of possible investment, not tied to any state.",
        sourceIds: ["jll_2026_global_data_center_outlook"],
      },
    ],
    factors: [
      {
        id: "demand-adjacency",
        label: "Nearby demand",
        score: 4,
        maxScore: 5,
        read: "Demand could come from aerospace, finance, health care, and regional digital services, and each project has to show its own.",
        sourceIds: ["jll_2026_global_data_center_outlook", "portmiami", "space_florida"],
      },
      {
        id: "power-readiness",
        label: "Power supply",
        score: 2,
        maxScore: 5,
        read: "We still need comparable figures on capacity under construction, grid interconnection, power purchases, and on-site generation.",
        sourceIds: ["cbre_h2_2025_data_centers", "florida_senate_sb484"],
      },
      {
        id: "project-visibility",
        label: "Project list",
        score: 2,
        maxScore: 5,
        read: "The project list is still incomplete, so a project can exist without a record here.",
        sourceIds: ["blue_origin_florida", "cbre_h2_2025_data_centers"],
      },
      {
        id: "incentive-discipline",
        label: "Incentive terms",
        score: 4,
        maxScore: 5,
        read: "Under the new law, each project's terms should say who pays, what the utility requires, what local approvals it needs, and what the economy gains.",
        sourceIds: ["florida_governor_sb484", "florida_senate_sb484"],
      },
      {
        id: "wage-conversion",
        label: "High-wage jobs",
        score: 3,
        maxScore: 5,
        read: "Wages, occupations, and job results show whether investment is moving Florida into higher-productivity work.",
        sourceIds: ["bls_state_april_2026", "fc100_ambition_accelerated"],
      },
    ],
  },
  highWageMonitor: {
    headline: "Jobs by industry and what they pay.",
    summary:
      "These are broad industry counts, shown for context. Pay, AI jobs, and the effect of any one investment need finer data.",
    metrics: [
      {
        id: "information-jobs",
        label: "Information jobs",
        value: "Live BLS series",
        context: "Information-sector employment",
        read: "The information sector covers several industries and only part of technology and data-center work.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "construction-jobs",
        label: "Construction jobs",
        value: "Live BLS series",
        context: "Construction-sector employment",
        read: "Construction jobs include homes, commercial buildings, and infrastructure. It takes project-level data to tie a change to any one project.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "professional-services",
        label: "Professional services",
        value: "Live BLS series",
        context: "Professional and business services",
        read: "Professional and business services include engineering, management, and administrative work, at widely different wages.",
        sourceIds: ["bls_state_april_2026"],
      },
    ],
  },
  forecasts: [
    {
      id: "ai-capex-gap",
      claim:
        "How much AI infrastructure investment is Florida attracting compared with similar states?",
      horizon: "6 to 18 months",
      confidence: "medium",
      mechanism:
        "Data-center projects can bring construction, engineering, utility, and operations work. Each project's capacity, spending, jobs, and costs show how much it adds.",
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
        "Established industries keep accounting for most of the documented investment in each region.",
      ambitionCase:
        "Computing projects that make commercial sense add capacity, pay their own infrastructure costs, and serve regional demand.",
      riskCase:
        "Limits on infrastructure delay good projects or make them cost more.",
      counterCase:
        "Changes in the labor market may come from participation, the industry mix, and the wider economy rather than AI investment.",
      updateTrigger:
        "Once comparable project-capacity lists and utility filings are available. Nothing here shows cause and effect.",
      sourceIds: ["bls_state_april_2026", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "florida-model-export",
      claim:
        "Which of Florida's economic development practices would work in other regions?",
      horizon: "12 to 36 months",
      confidence: "medium",
      mechanism:
        "Comparing policies takes evidence on institutions, costs, the industry mix, and results. Florida's geography and its population growth may not carry over to another state.",
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
        "The evidence supports some practices where local conditions are similar.",
      ambitionCase:
        "Documented gains in delivered investment and workforce results give other states something to study.",
      riskCase:
        "Policies are adopted without allowing for different local conditions or the ability to carry them out.",
      counterCase:
        "Geography, climate, migration, and the industry mix may explain results that get credited to policy.",
      updateTrigger:
        "After comparable outcome studies are available.",
      sourceIds: ["florida_chamber_income_migration", "fc100_ambition_accelerated", "florida_taxwatch", "james_madison_institute"],
    },
  ],
  policyMemos: [
    {
      id: "strategic-compute-not-dumb-load",
      title: "Data-center investment and infrastructure costs.",
      stance:
        "Weigh each data-center investment together with protecting ratepayers and the local infrastructure it needs.",
      whatChanged:
        "CS/CS/SB 484 became Chapter 2026-65. Its principal effective date is July 1, 2026, with exceptions identified in the law.",
      mechanism:
        "A good project review separates what the private investment brings from the electricity, water, and infrastructure costs other customers would pay.",
      recommendation:
        "For each proposal, ask where its power comes from, how much water it uses, what it needs from the grid, who pays those costs, and what jobs it commits to. Any incentive should come with written terms and benefits the public can measure.",
      whatNotToDo:
        "Count the public benefit when the money is spent, and judge each data center's costs and needs on its own.",
      nextMoves: [
        "Florida's data-center megawatts in the pipeline and its utility tariff filings",
        "A named list of data-center, grid, and advanced manufacturing projects",
        "The computing needs of the Space Coast, Latin America trade, health, finance, and emergency response",
      ],
      sourceIds: ["florida_governor_sb484", "florida_senate_sb484", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "wage-curve-scoreboard",
      title: "Judge industry policy by wages.",
      stance:
        "Judge industry policy by wages, productivity, and lasting jobs, along with the investment totals.",
      whatChanged:
        "The latest job figures differ by industry and by measure, and total growth says little about how good the jobs are.",
      mechanism:
        "More residents mean more demand. Capital investment can add productive capacity, but the result depends on the kind of project, how it is carried out, and the workers available.",
      recommendation:
        "Measure progress with occupational wages, BLS industry wage data, credentials earned, and regional employment results.",
      whatNotToDo:
        "Count measured wages. Business applications, income from new residents, and announced jobs can't stand in for them.",
      nextMoves: [
        "A set of high-wage occupations for each industry cluster",
        "Wages in the target clusters against the state median",
        "The link from education programs and credentials to jobs",
      ],
      sourceIds: ["bls_state_april_2026", "fc100_ambition_accelerated", "florida_taxwatch", "james_madison_institute"],
    },
  ],
  evidenceBlocks: [
    {
      id: "exportable-model",
      title: "Where Florida's growth comes from",
      briefCopy:
        "Florida's growth comes from population, investment, infrastructure, and skills working together. Measure them by jobs, wages, and productivity.",
      exportUse:
        "Read alongside the current labor, population, and industry data.",
      sourceIds: ["florida_chamber_income_migration", "fc100_ambition_accelerated"],
    },
    {
      id: "ai-capex-question",
      title: "Where Florida stands on AI infrastructure",
      briefCopy:
        "Florida has no hyperscale campus operating, under construction, or announced. Whether it trails similar states on AI infrastructure overall still needs a complete, comparable project list.",
      exportUse:
        "Read alongside a dated, comparable inventory of capacity and project stages.",
      sourceIds: ["bls_state_april_2026", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "discipline-frame",
      title: "How to review a project",
      briefCopy:
        "A project review should say who pays for the infrastructure, who carries the risk, and what measurable benefits the region gets.",
      exportUse:
        "Floridanomics analysis. The enacted law and utility decisions set the rules.",
      sourceIds: ["florida_governor_sb484", "florida_senate_sb484"],
    },
    {
      id: "physical-innovation",
      title: "Regional infrastructure and industries",
      briefCopy:
        "Ports, space facilities, university research, and specialized manufacturers give each Florida region different strengths.",
      exportUse:
        "The atlas and the regional profiles give the local context.",
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

  // When the month a year back was never published, the base slides to the nearest earlier month. Name it.
  const measuredFrom = (metric: { latest: { date: string }; deltas: { oneYear: { baseDate: string } | null } }): string | null => {
    const base = metric.deltas.oneYear?.baseDate;
    if (!base) return null;
    const latest = new Date(metric.latest.date);
    const from = new Date(base);
    const months = (latest.getUTCFullYear() - from.getUTCFullYear()) * 12 + (latest.getUTCMonth() - from.getUTCMonth());
    return months === 12 ? null : from.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  };
  const yearPhrase = (metric: Parameters<typeof measuredFrom>[0], exact: string): string => {
    const from = measuredFrom(metric);
    return from ? `from ${from}, the closest month with a published figure` : exact;
  };
  const unemploymentYoy = unemployment.deltas.oneYear?.absolute ?? 0;
  const laborForceYoy = laborForce.deltas.oneYear?.absolute ?? 0;
  const payrollYoy = payrolls.deltas.oneYear?.absolute ?? 0;

  const headline = `Florida payroll employment is ${payrollYoy >= 0 ? "higher" : "lower"} than a year ago; unemployment is ${unemployment.latest.value.toFixed(1)}%.`;

  const whatStandsOut = [
    `${payrolls.label} are ${payrollYoy >= 0 ? "up" : "down"} ${Math.abs(payrollYoy).toFixed(1)}k over the last year.`,
    `${laborForce.label} is ${laborForceYoy >= 0 ? "up" : "down"} ${Math.abs(laborForceYoy).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} people ${yearPhrase(laborForce, "year-over-year")}.`,
    `Population reached ${Math.round(population.latest.value).toLocaleString("en-US")} in ${new Date(
      population.latest.date,
    ).getUTCFullYear()}.`,
  ];

  const improving = [
    unemploymentYoy < 0
      ? `Unemployment improved by ${Math.abs(unemploymentYoy).toFixed(1)} percentage points ${yearPhrase(unemployment, "year-over-year")}.`
      : `The unemployment rate is ${unemployment.latest.value.toFixed(1)}%, up ${unemploymentYoy.toFixed(1)} percentage points ${yearPhrase(unemployment, "over the year")}.`,
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
        return `${sector.label} has fewer jobs than a year ago (${yoy?.toFixed(1) ?? "n/a"}%).`;
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
      notes: "Monthly labor market and payroll job series for the state and its metros.",
    },
    { ...WSER_SOURCE },
    {
      id: "census_population",
      name: "U.S. Census Bureau Population Estimates (via FRED FLPOP)",
      url: "https://fred.stlouisfed.org/series/FLPOP",
      notes: "Florida's resident population each year, from Census Bureau estimates published on FRED.",
    },
    {
      id: "fred_innovation",
      name: "FRED state economic indicators",
      url: "https://fred.stlouisfed.org/",
      notes: "Florida's business applications and real gross state product.",
    },
    {
      id: "federal_data_spine",
      name: "Federal economic series",
      url: "https://www.bls.gov/developers/",
      notes:
        "Federal series from BLS, Census, BEA, EIA, and the IRS, each shown with its status and period.",
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
        "Compare jobs, operating costs, industries, and workforce training in Florida and selected peer states. Regional assets and policy scenarios are included for context.",
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
