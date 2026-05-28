import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  DashboardDataset,
  Delta,
  IndustrySector,
  InnovationMetricId,
  InnovationResource,
  Metric,
  MetroSnapshot,
  PeerStateSnapshot,
  PopulationMetric,
  StrategyLayer,
  TerminalLayer,
  TimePoint,
} from "../src/types/dashboard";

type BlsPoint = {
  year: string;
  period: string;
  value: string;
};

type BlsSeries = {
  seriesID: string;
  data: BlsPoint[];
};
type PreservedSections = Pick<DashboardDataset, "scorecard2030" | "competition" | "distinctives" | "trade">;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 2000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt + 1} failed (${message}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error("Unreachable");
}

const CURRENT_YEAR = new Date().getUTCFullYear();
const START_YEAR = String(CURRENT_YEAR - 9);
const END_YEAR = String(CURRENT_YEAR);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_FILE = path.join(ROOT, "public", "data", "florida-economy.json");

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
      merged.push(source);
    }
  }

  return merged;
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
    status: "Draft intelligence note",
    title: "Is Florida missing the AI capex boom?",
    summary:
      "Florida's 4.8% unemployment rate sits beside a +40,500 payroll month. The next question is whether Texas and other states are capturing the infrastructure-heavy AI layer Florida has not yet measured.",
    ctaLabel: "Open the brief",
    href: "briefs/ai-capex-gap/",
    sources: [
      {
        label: "BLS April 2026 state release",
        url: "https://www.bls.gov/news.release/archives/laus_05222026.htm",
      },
      {
        label: "CBRE North America Data Center Trends",
        url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025",
      },
    ],
  },
  {
    id: "strategic-compute-not-dumb-load",
    kicker: "Policy read",
    status: "Watch item",
    title: "Strategic compute, not dumb load.",
    summary:
      "SB 484 makes the ratepayer case explicit: data centers should cover their own power, transmission, and water costs. The harder product question is how Florida competes for strategic compute without shifting the bill to households.",
    sources: [
      {
        label: "Florida Governor SB 484 release",
        url: "https://www.flgov.com/eog/news/press/2026/governor-ron-desantis-signs-law-protect-floridians-subsidizing-data-centers",
      },
    ],
  },
  {
    id: "florida-shaped-compute-lane",
    kicker: "Next module",
    status: "Scoping",
    title: "The Florida lane is edge, LATAM, Space Coast.",
    summary:
      "Florida does not need to copy a Texas training-campus strategy. The stronger lane is inference near population, LATAM gateways, Space Coast aerospace compute, and resilient edge capacity that pays its own way.",
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
    url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025",
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
    thesis: "Florida should track whether it is missing the power-heavy AI infrastructure boom while peers absorb larger data-center and semiconductor projects.",
    bottleneck: "Power, water, transmission, and whether incentives distinguish strategic compute from dumb load.",
    proof: "The active Florida Brain thesis is that unemployment softness may partly reflect missed industrial capex, not just a normal labor cycle.",
    whatToTrack: "Data-center megawatts, interconnection queue, industrial power rates, project capex, and high-wage construction plus operations jobs.",
    sources: [
      {
        label: "Florida Brain AI capex brief",
        url: "https://tonyv2289.github.io/floridanomics-dashboard-mvp/briefs/ai-capex-gap/",
      },
      {
        label: "CBRE data center trends",
        url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025",
      },
    ],
  },
  {
    id: "space-coast-aerospace",
    title: "Space Coast aerospace cadence",
    thesis: "Florida's most distinctive innovation cluster is physical: launches, factories, spaceport infrastructure, and dual-use manufacturing.",
    bottleneck: "Specialized talent, industrial sites, supplier depth, and how much of the value chain stays in Florida.",
    proof: "The dashboard already tracks 109 launches, a $6B aerospace pipeline, and Blue Origin's $600M Cape Canaveral expansion.",
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
    thesis: "South Florida's gateway claim is strongest where trade, finance, aviation, containers, and relationships stack together.",
    bottleneck: "Cold-chain capacity, port throughput, customs efficiency, insurance, and last-mile infrastructure.",
    proof: "PortMiami and Port Everglades give the dashboard a physical trade base instead of a slogan.",
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
    thesis: "Florida cannot become the next-economy state if credentials, degrees, and STEM labor supply do not map to target clusters.",
    bottleneck: "The dashboard still needs education-to-employment outcomes by region and industry.",
    proof: "Tennessee and Washington show the better model: talent supply and wage outcomes belong next to economic ambition.",
    whatToTrack: "Degrees, credentials, target occupations, wage outcomes, STEM gaps, and regional placement into priority clusters.",
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
  title: "The next dashboard gap is education-to-employment proof.",
  summary:
    "The benchmark scan says Floridanomics should connect credentials, degrees, target occupations, and wage outcomes. That turns workforce from a talking point into a strategy surface.",
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
    "The talent question is not whether Florida has people. The question is whether the state's education and credential pipeline maps to the clusters it says it wants to win.",
    "This should become a source-linked module with program output, regional job demand, wage outcomes, and cluster placement. That is the missing bridge between Florida Brain narrative and workforce policy.",
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
      "Business formation remains strong but information employment is not yet escape velocity.",
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
    summary: "Florida captures more AI, aerospace, LATAM logistics, life-sciences, and advanced-services investment without subsidizing dumb load.",
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
        url: "https://tonyv2289.github.io/floridanomics-dashboard-mvp/briefs/ai-capex-gap/",
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
      "Florida Brain has to explain why a high-growth state is not leading the high-wage cycle.",
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

const TERMINAL_LAYER: TerminalLayer = {
  headline: "Export the Florida model as an operating system, not a slogan.",
  thesis:
    "Florida's advantage is not one metric. It is migration, business formation, low-tax discipline, gateway infrastructure, aerospace cadence, and policy restraint working together. The open question is whether that model can also win the power-heavy AI capex cycle without making households subsidize it.",
  operatingQuestion:
    "Is Florida converting population and capital inflow into high-wage strategic industries faster than peer states, or is it letting the largest capex boom in modern infrastructure compound somewhere else?",
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
      label: "CBRE H2 2025 data center trends",
      url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025",
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
      note: "Canonical public source for the $4M-plus per hour net income-migration frame.",
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
      "Prototype editorial index. It is source-backed but not an official state score until Florida-specific MW pipeline, interconnection, power-price, and project-award data are wired.",
    metrics: [
      {
        id: "florida-payroll-jump",
        label: "Florida payroll pulse",
        value: "+40,500",
        context: "April 2026 monthly nonfarm payroll change, largest among states",
        read: "The labor market is not collapsing. The better question is composition: are the new jobs part of the next capex cycle or mostly population-serving growth?",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "florida-unemployment-watch",
        label: "Unemployment warning light",
        value: "4.8%",
        context: "Florida April 2026 unemployment rate, up 1.1 percentage points year over year",
        read: "Florida is no longer telling a simple tight-labor-market story. Elevated unemployment beside a payroll jump demands a sector and wage-quality read.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "texas-peer-spread",
        label: "Texas comparison",
        value: "4.3%",
        context: "Texas April 2026 unemployment rate",
        read: "Texas is not proof by itself, but it is the right peer to test whether power-heavy capex is converting into labor-market resilience.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "dallas-absorption",
        label: "Dallas data-center absorption",
        value: "470.8 MW",
        context: "CBRE H2 2025 primary-market net absorption",
        read: "This is the concrete 'eating our lunch' benchmark: hyperscale demand is landing in measurable megawatts in Texas markets.",
        sourceIds: ["cbre_h2_2025_data_centers"],
      },
      {
        id: "global-ai-supercycle",
        label: "AI infrastructure supercycle",
        value: "$3T",
        context: "JLL estimate for total data-center investment over the next five years",
        read: "If the global capacity base nearly doubles by 2030, missing even a small slice is a real strategic opportunity cost.",
        sourceIds: ["jll_2026_global_data_center_outlook"],
      },
    ],
    factors: [
      {
        id: "demand-adjacency",
        label: "Demand adjacency",
        score: 4,
        maxScore: 5,
        read: "Florida has population, LATAM, aerospace, finance, and edge-inference use cases that make strategic compute plausible.",
        sourceIds: ["jll_2026_global_data_center_outlook", "portmiami", "space_florida"],
      },
      {
        id: "power-readiness",
        label: "Power readiness",
        score: 2,
        maxScore: 5,
        read: "The missing dataset is Florida-specific MW under construction, interconnection queue, power procurement, and self-supply capacity.",
        sourceIds: ["cbre_h2_2025_data_centers", "florida_senate_sb484"],
      },
      {
        id: "project-visibility",
        label: "Project visibility",
        score: 2,
        maxScore: 5,
        read: "Florida can name aerospace wins clearly. It cannot yet show a comparable AI compute project ledger.",
        sourceIds: ["blue_origin_florida", "cbre_h2_2025_data_centers"],
      },
      {
        id: "incentive-discipline",
        label: "Incentive discipline",
        score: 4,
        maxScore: 5,
        read: "SB 484 is directionally sound: no household subsidy for dumb load. The upgrade is a fast lane for strategic compute that pays its own way.",
        sourceIds: ["florida_governor_sb484", "florida_senate_sb484"],
      },
      {
        id: "wage-conversion",
        label: "High-wage conversion",
        score: 3,
        maxScore: 5,
        read: "Business formation and migration are strong, but the terminal needs OEWS, QCEW, and cluster wage data to prove the wage curve is bending.",
        sourceIds: ["bls_state_april_2026", "fc100_ambition_accelerated"],
      },
    ],
  },
  highWageMonitor: {
    headline: "The next scorecard is not job count. It is wage-quality conversion.",
    summary:
      "Florida can add jobs and still lose the next cycle if growth concentrates in lower-wage population services while AI, aerospace, chips, advanced logistics, and life-science capex land elsewhere.",
    metrics: [
      {
        id: "information-jobs",
        label: "Information jobs",
        value: "Live BLS series",
        context: "Knowledge-work bench and AI-adjacent services",
        read: "If AI infrastructure is becoming a real Florida industry, information employment should stop behaving like a thin support sector.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "construction-jobs",
        label: "Construction jobs",
        value: "Live BLS series",
        context: "Capex build-out proxy",
        read: "Data centers, aerospace factories, ports, and grid upgrades should first show up in construction and specialty-trade labor demand.",
        sourceIds: ["bls_state_april_2026"],
      },
      {
        id: "professional-services",
        label: "Professional services",
        value: "Live BLS series",
        context: "Managerial, technical, and advisory depth",
        read: "The Florida model needs headquarters, engineering, finance, legal, and operations work attached to the physical build-out.",
        sourceIds: ["bls_state_april_2026"],
      },
    ],
  },
  projectLedger: [
    {
      id: "blue-origin-cape",
      name: "Blue Origin Cape Canaveral expansion",
      geography: "Space Coast",
      sector: "Aerospace manufacturing",
      capex: "$600M",
      jobs: "500 high-wage jobs",
      stage: "Announced",
      strategicRead:
        "This is the model project: physical innovation, manufacturing depth, and Space Coast specialization in one investable proof point.",
      sourceIds: ["blue_origin_florida"],
    },
    {
      id: "space-florida-pipeline",
      name: "Space Florida aerospace pipeline",
      geography: "Statewide aerospace corridor",
      sector: "Aerospace and spaceport infrastructure",
      capex: "$6B",
      jobs: "220-project pipeline",
      stage: "Pipeline",
      strategicRead:
        "A project pipeline this large deserves to sit beside labor, supplier, and wage data so Florida can prove the cluster is deepening.",
      sourceIds: ["space_florida"],
    },
    {
      id: "ai-compute-gap",
      name: "Florida strategic compute ledger",
      geography: "TBD",
      sector: "AI infrastructure",
      capex: "Measurement gap",
      jobs: "TBD",
      stage: "Needs source wiring",
      strategicRead:
        "This is the glaring blank space. If peers can publish megawatts, capex, tenants, and construction timelines, Florida Brain should track the absence as aggressively as the wins.",
      sourceIds: ["cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "portmiami-gateway",
      name: "PortMiami gateway capacity",
      geography: "Miami-Dade",
      sector: "LATAM logistics",
      capex: "10.1M tons / 1.09M TEUs",
      jobs: "Capacity proxy",
      stage: "Operating asset",
      strategicRead:
        "The Americas gateway is not marketing copy. It is a physical logistics base that can support trade, finance, perishables, and regional compute demand.",
      sourceIds: ["portmiami"],
    },
    {
      id: "port-everglades-cold-chain",
      name: "Port Everglades cold-chain capacity",
      geography: "Broward",
      sector: "Refrigerated logistics",
      capex: "126,392 reefer TEUs",
      jobs: "Capacity proxy",
      stage: "Operating asset",
      strategicRead:
        "Cold-chain depth is part of the Florida model because gateway trade is a high-infrastructure business, not just a tourism-adjacent story.",
      sourceIds: ["port_everglades"],
    },
  ],
  forecasts: [
    {
      id: "ai-capex-gap",
      claim:
        "Florida's unemployment softness may partly reflect under-capture of the AI infrastructure capex cycle, not just a normal labor-market cooldown.",
      horizon: "6 to 18 months",
      confidence: "medium",
      mechanism:
        "AI infrastructure first creates power, construction, engineering, and operations demand. If those projects land in Texas, Arizona, Georgia, North Carolina, or Virginia instead of Florida, peer labor markets can look stronger even when Florida keeps winning migration.",
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
        "Florida remains a migration, formation, aerospace, and gateway state, but AI infrastructure stays under-measured and secondary.",
      ambitionCase:
        "Florida creates a strategic-compute lane tied to self-funded power, grid resilience, Space Coast, LATAM, health, and financial-services workloads.",
      riskCase:
        "Florida blocks or slows too much strategic compute while peers compound power, fiber, and high-wage operations ecosystems.",
      counterCase:
        "The unemployment increase is mainly labor-supply normalization and sector churn; Florida's monthly payroll gain shows demand is still broad enough.",
      updateTrigger:
        "Upgrade or downgrade the thesis when Florida-specific MW pipeline, utility tariff filings, or named AI infrastructure projects become source-visible.",
      sourceIds: ["bls_state_april_2026", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "florida-model-export",
      claim:
        "The Florida model can travel if it is framed as a growth operating system: fiscal discipline, fast formation, migration pull, gateway assets, and strategic infrastructure.",
      horizon: "12 to 36 months",
      confidence: "medium",
      mechanism:
        "Other states and countries can copy pieces of Florida, but the exportable product is the sequencing: attract people and capital, protect taxpayers, then convert that demand into clusters with measurable wage outcomes.",
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
        "Florida Brain becomes a strong state dashboard and content engine for internal strategy.",
      ambitionCase:
        "Floridanomics becomes a reusable model for governors, chambers, economic developers, founders, and investors outside Florida.",
      riskCase:
        "The brand becomes boosterism if the dashboard cannot show the difference between population growth and productivity growth.",
      counterCase:
        "Florida's model may be too dependent on unique tax, weather, migration, and regional-gateway advantages to export cleanly.",
      updateTrigger:
        "Advance the export thesis only when the terminal can show source-linked playbooks, not just state pride.",
      sourceIds: ["florida_chamber_income_migration", "fc100_ambition_accelerated", "florida_taxwatch", "james_madison_institute"],
    },
  ],
  policyMemos: [
    {
      id: "strategic-compute-not-dumb-load",
      title: "Strategic compute, not dumb load.",
      stance:
        "Florida should not subsidize hyperscale loads through household utility bills. It also should not confuse disciplined cost allocation with surrendering the AI infrastructure race.",
      whatChanged:
        "SB 484 makes the ratepayer line explicit: large-load customers pay their own cost of service, local governments keep authority, and utility risk should not be shifted to the public.",
      mechanism:
        "The policy problem is separating strategic compute that strengthens the grid, pays full freight, and creates high-wage work from passive load that raises costs without a local productivity payoff.",
      recommendation:
        "Create a Florida strategic-compute fast lane for projects that bring their own power or grid assets, cover full marginal cost, use reclaimed water where appropriate, disclose deal terms after exemption periods, and tie incentives to high-wage operations and Florida-specific workloads.",
      whatNotToDo:
        "Do not write blank checks, do not socialize utility costs, do not block every project, and do not copy Texas if the better Florida lane is edge, LATAM, Space Coast, health, finance, and resilient inference.",
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
        "The next Floridanomics product should judge policy by whether it bends the wage curve in target clusters, not whether it produces a bigger ribbon-cutting number.",
      whatChanged:
        "Florida can plausibly be both a strong jobs state and a state with warning lights. That contradiction is the product opportunity.",
      mechanism:
        "Population growth creates demand. Strategic capex creates productivity. The dashboard has to separate those two engines.",
      recommendation:
        "Wire OEWS, QCEW, workforce credentials, target occupations, and county-level wage outcomes into the terminal before declaring a cluster strategy successful.",
      whatNotToDo:
        "Do not let total jobs, startup counts, or migration dollars substitute for high-wage conversion.",
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
        "Florida's model is a growth flywheel: people move in, capital follows, formation accelerates, the tax base expands, and policy has to convert that demand into high-wage clusters without losing fiscal discipline.",
      exportUse:
        "Use this as the opening frame for a global Florida Model brief, investor deck, or governor-level policy memo.",
      sourceIds: ["florida_chamber_income_migration", "fc100_ambition_accelerated"],
    },
    {
      id: "ai-capex-question",
      title: "The uncomfortable AI question",
      briefCopy:
        "Florida is winning people and payrolls, but the AI infrastructure boom is measured in megawatts, power procurement, construction pipelines, and high-wage operations. If that ledger is blank, it is not neutral.",
      exportUse:
        "Use this as the thesis paragraph for the AI Capex Gap briefing page and the next Florida Brain issue.",
      sourceIds: ["bls_state_april_2026", "cbre_h2_2025_data_centers", "jll_2026_global_data_center_outlook"],
    },
    {
      id: "discipline-frame",
      title: "The policy discipline frame",
      briefCopy:
        "The pro-growth answer is not subsidy or refusal. It is a disciplined market design: strategic compute pays full cost, strengthens infrastructure, and earns speed only when the public does not carry the bill.",
      exportUse:
        "Use this as the sound policy spine for op-eds, testimony, and chamber-facing memos.",
      sourceIds: ["florida_governor_sb484", "florida_senate_sb484"],
    },
    {
      id: "physical-innovation",
      title: "Physical innovation is Florida's lane",
      briefCopy:
        "Florida's most distinctive innovation assets are physical: ports, launches, aerospace manufacturing, logistics, health, and energy-resilient edge demand. The dashboard should make that visible.",
      exportUse:
        "Use this to move Florida Brain beyond generic startup ecosystem coverage.",
      sourceIds: ["space_florida", "blue_origin_florida", "portmiami", "port_everglades"],
    },
  ],
};

function metricSeriesId(root: string, measureCode: "003" | "005" | "006") {
  return `${root}${measureCode}`;
}

function stateLausSeriesId(fips: string, measureCode: "003" | "005" | "006") {
  return `LASST${fips}000000000000${measureCode.slice(2)}`;
}

function statePayrollSeriesId(fips: string) {
  return `SMS${fips}000000000000001`;
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
    await withRetry(async () => {
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
    });
  }

  return result;
}

async function fetchFredSeries(seriesId: string, transformValue?: (value: number) => number): Promise<TimePoint[]> {
  const csv = await withRetry(async () => {
    const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`);
    if (!response.ok) {
      throw new Error(`FRED series request failed for ${seriesId} with HTTP ${response.status}`);
    }
    return response.text();
  });
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

  const allBlsIds = [...coreSeriesIds, ...industrySeriesIds, ...metroSeriesIds, ...peerStateSeriesIds];
  let blsData: Record<string, TimePoint[]>;
  try {
    blsData = await fetchBlsSeries(allBlsIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("daily threshold")) {
      throw error;
    }

    if (!existingDataset) {
      throw new Error("BLS daily threshold reached and no existing dataset was available for cached fallback.");
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

  const preservedSections = getPreservedSections(existingDataset);
  const dynamicSources: DashboardDataset["sources"] = [
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
  ];

  const dataset: DashboardDataset = {
    generatedAt: new Date().toISOString(),
    asOfLaborMarket: prettyMonth(metrics.unemploymentRate.latest.date),
    asOfPopulation: String(new Date(metrics.population.latest.date).getUTCFullYear()),
    sources: mergeSources(dynamicSources, existingDataset?.sources ?? [], STRATEGY_SOURCE_STACK, TERMINAL_SOURCE_STACK),
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
      headline: "Florida needs a strategy cockpit, not another data portal.",
      summary:
        "This layer benchmarks Florida against competitor states, translates outside dashboard models into product moves, and frames the next-economy question around peer states, clusters, talent, metros, and scenarios.",
      peerStates,
      benchmarkExamples: STRATEGY_BENCHMARK_EXAMPLES,
      clusters: STRATEGY_CLUSTERS,
      talentPipeline: STRATEGY_TALENT_PIPELINE,
      scenarios: STRATEGY_SCENARIOS,
    },
    competition: preservedSections.competition,
    terminal: TERMINAL_LAYER,
    scorecard2030: preservedSections.scorecard2030,
    distinctives: preservedSections.distinctives,
    trade: preservedSections.trade,
  };

  if (existingDataset && JSON.stringify(normalizeForComparison(existingDataset)) === JSON.stringify(normalizeForComparison(dataset))) {
    dataset.generatedAt = existingDataset.generatedAt;
  }

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`As-of labor market: ${dataset.asOfLaborMarket}; population: ${dataset.asOfPopulation}`);
  console.log("Preserved curated sections: scorecard2030, brainNotes, competition, terminal, distinctives, trade.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
