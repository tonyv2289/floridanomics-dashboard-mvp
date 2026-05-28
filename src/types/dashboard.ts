export type TimePoint = {
  date: string;
  value: number;
};

export type Delta = {
  years: number;
  baseDate: string;
  absolute: number;
  percent: number | null;
};

export type MetricUnit = "percent" | "persons" | "thousands_jobs" | "count" | "usd_millions";
export type MetricSource = "BLS" | "FRED" | "Census_via_FRED";

export type Metric = {
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

export type PopulationMetric = {
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

export type IndustrySector = {
  id: string;
  label: string;
  latest: TimePoint;
  deltas: Metric["deltas"];
  sparkline: TimePoint[];
  source: "BLS";
};

export type MetroSnapshot = {
  id: string;
  name: string;
  unemploymentRate: Pick<Metric, "latest" | "deltas" | "sparkline">;
  laborForce: Pick<Metric, "latest" | "deltas" | "sparkline">;
  employmentLevel: Pick<Metric, "latest" | "deltas" | "sparkline">;
};

export type InnovationMetricId =
  | "informationEmployment"
  | "professionalBusinessEmployment"
  | "businessApplications"
  | "realGsp"
  | "constructionEmployment";

export type InnovationResource = {
  id: string;
  name: string;
  category: "Capital" | "Programs" | "Ecosystem" | "Policy" | "Infrastructure";
  region: "Statewide" | "Miami" | "Tampa Bay" | "Orlando" | "Jacksonville";
  summary: string;
  url: string;
};

export type InsightSource = {
  label: string;
  url: string;
};

export type InsightStat = {
  label: string;
  value: string;
  context: string;
  source?: InsightSource;
  note?: string;
};

export type InsightSection = {
  eyebrow: string;
  title: string;
  summary: string;
  stats: InsightStat[];
  interpretation: string[];
  sources: InsightSource[];
};

export type FloridaBrainNote = {
  id: string;
  kicker: string;
  status: string;
  title: string;
  summary: string;
  ctaLabel?: string;
  href?: string;
  sources: InsightSource[];
};

export type PeerStateSnapshot = {
  id: "FL" | "TX" | "GA" | "NC" | "TN" | "AZ" | "UT" | "CA";
  name: string;
  shortName: string;
  positioning: string;
  watch: string;
  unemploymentRate: Pick<Metric, "latest" | "deltas" | "sparkline">;
  laborForce: Pick<Metric, "latest" | "deltas" | "sparkline">;
  nonfarmPayrolls: Pick<Metric, "latest" | "deltas" | "sparkline">;
  sources: InsightSource[];
};

export type BenchmarkExample = {
  id: string;
  name: string;
  model: string;
  takeaway: string;
  source: InsightSource;
};

export type StrategyCluster = {
  id: string;
  title: string;
  thesis: string;
  bottleneck: string;
  proof: string;
  whatToTrack: string;
  sources: InsightSource[];
};

export type StrategyScenario = {
  id: "base" | "ambition" | "risk";
  label: string;
  status: string;
  summary: string;
  signals: string[];
  sources: InsightSource[];
};

export type StrategyLayer = {
  headline: string;
  summary: string;
  peerStates: PeerStateSnapshot[];
  benchmarkExamples: BenchmarkExample[];
  clusters: StrategyCluster[];
  talentPipeline: InsightSection;
  scenarios: StrategyScenario[];
};

export type TerminalSource = {
  id: string;
  label: string;
  url: string;
  tier: "official" | "industry" | "policy" | "benchmark" | "internal";
  note: string;
};

export type TerminalMetric = {
  id: string;
  label: string;
  value: string;
  context: string;
  read: string;
  sourceIds: string[];
};

export type TerminalIndexFactor = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  read: string;
  sourceIds: string[];
};

export type TerminalProject = {
  id: string;
  name: string;
  geography: string;
  sector: string;
  capex: string;
  jobs: string;
  stage: string;
  strategicRead: string;
  sourceIds: string[];
};

export type TerminalForecast = {
  id: string;
  claim: string;
  horizon: string;
  confidence: "low" | "medium" | "high";
  mechanism: string;
  leadingIndicators: string[];
  laggingIndicators: string[];
  baseCase: string;
  ambitionCase: string;
  riskCase: string;
  counterCase: string;
  updateTrigger: string;
  sourceIds: string[];
};

export type TerminalPolicyMemo = {
  id: string;
  title: string;
  stance: string;
  whatChanged: string;
  mechanism: string;
  recommendation: string;
  whatNotToDo: string;
  nextMoves: string[];
  sourceIds: string[];
};

export type TerminalEvidenceBlock = {
  id: string;
  title: string;
  briefCopy: string;
  exportUse: string;
  sourceIds: string[];
};

export type CompetitionSource = {
  id: string;
  label: string;
  kind: "Dropbox source" | "Vault derivative" | "Public source";
  macStudioPath: string;
  localPath?: string;
  url?: string;
  note: string;
  status: "vault_logged" | "needs_refresh" | "public_source";
};

export type CompetitionMetric = {
  id: string;
  label: string;
  value: string;
  context: string;
  read: string;
  sourceIds: string[];
};

export type FdiCompetitorState = {
  id: "FL" | "TX" | "CA" | "NY" | "GA" | "NC" | "TN";
  name: string;
  tier: string;
  fdiJobs: number;
  greenfieldProjects: number;
  fdiPpeUsdBillions: number | null;
  firstYearExpendituresUsdBillions: number | null;
  capitalIntensityRead: string;
  posture: string;
  sourceIds: string[];
};

export type FdiObservatoryScore = {
  id: "stock" | "flow" | "quality" | "pipeline";
  label: string;
  score: number;
  maxScore: number;
  value: string;
  delta: string;
  status: string;
  read: string;
  sourceIds: string[];
};

export type FdiDeltaState = {
  id: string;
  state: string;
  latestExpendituresUsdBillions: number | null;
  oneYearExpendituresPercent: number | null;
  currentEmploymentThousands: number | null;
  oneYearEmploymentPercent: number | null;
  greenfieldSharePercent: number | null;
  momentum: "accelerating" | "mixed" | "slowing" | "suppressed";
  read: string;
  sourceIds: string[];
};

export type CompetitionArrowDirection = "up" | "right" | "down" | "neutral";

export type MetroCompetitionSignal = {
  label: string;
  direction: CompetitionArrowDirection;
  value: string;
  detail: string;
};

export type MetroCompetitionRegion = {
  id: "south-florida" | "austin" | "seattle";
  name: string;
  federalName: string;
  role: string;
  momentum: "accelerating" | "mixed" | "slowing";
  verdict: string;
  read: string;
  signals: MetroCompetitionSignal[];
  sourceIds: string[];
};

export type PolicyToolkitState = {
  id: string;
  state: string;
  competitorSignal: string;
  tools: string[];
  floridaGap: string;
  sourceIds: string[];
};

export type MigrationRank = {
  rank: number;
  state: string;
  netMigration2021: number;
  netMigration2022: number;
};

export type SemiconductorCommitment = {
  id: string;
  label: string;
  valueUsd: number;
  context: string;
};

export type StateCompetitionLayer = {
  headline: string;
  summary: string;
  vaultLog: {
    macStudioPath: string;
    localPath: string;
    caveat: string;
  };
  sources: CompetitionSource[];
  metroComparison: {
    headline: string;
    summary: string;
    asOf: string;
    regions: MetroCompetitionRegion[];
  };
  fdiScoreboard: {
    headline: string;
    summary: string;
    observatory: {
      headline: string;
      summary: string;
      scores: FdiObservatoryScore[];
      deltas: FdiDeltaState[];
    };
    metrics: CompetitionMetric[];
    states: FdiCompetitorState[];
  };
  policyToolkit: {
    headline: string;
    summary: string;
    states: PolicyToolkitState[];
  };
  institutionalCapacity: {
    headline: string;
    summary: string;
    metrics: CompetitionMetric[];
    operatingLessons: string[];
    sourceIds: string[];
  };
  migration: {
    headline: string;
    summary: string;
    rankings: MigrationRank[];
    read: string;
    sourceIds: string[];
  };
  semiconductor: {
    headline: string;
    summary: string;
    commitments: SemiconductorCommitment[];
    read: string;
    sourceIds: string[];
  };
  nextMoves: string[];
};

export type FederalFeedStatus = "live" | "fallback" | "needs_key" | "download_required" | "error";

export type FederalSourceTier = "federal_api" | "federal_download" | "federal_via_fred";

export type FederalSource = {
  id: string;
  agency: string;
  label: string;
  tier: FederalSourceTier;
  url: string;
  apiUrl?: string;
  envKey?: string;
  status: FederalFeedStatus;
  note: string;
};

export type FederalSignal = {
  id: string;
  label: string;
  value: string;
  unit: string;
  geography: string;
  period: string;
  sourceId: string;
  status: FederalFeedStatus;
  read: string;
  retrievedAt: string;
  sourceUrl: string;
  caveat?: string;
};

export type FederalDataLayer = {
  headline: string;
  summary: string;
  refreshedAt: string;
  sources: FederalSource[];
  signals: FederalSignal[];
  missingKeys: string[];
  nextFeeds: string[];
};

export type TerminalLayer = {
  headline: string;
  thesis: string;
  operatingQuestion: string;
  sources: TerminalSource[];
  aiCapexIndex: {
    label: string;
    score: number;
    maxScore: number;
    rating: string;
    caveat: string;
    metrics: TerminalMetric[];
    factors: TerminalIndexFactor[];
  };
  highWageMonitor: {
    headline: string;
    summary: string;
    metrics: TerminalMetric[];
  };
  projectLedger: TerminalProject[];
  forecasts: TerminalForecast[];
  policyMemos: TerminalPolicyMemo[];
  evidenceBlocks: TerminalEvidenceBlock[];
};

export type TradeHeadlineMetric = {
  id: string;
  label: string;
  value: number;
  unit: "usd_billions" | "percent" | "count";
  helper: string;
};

export type TradeDelta = {
  id: "oneYear" | "sevenYear" | "fiscalYear" | "mfgShare";
  label: string;
  absolute: number | null;
  percent: number | null;
  baseLabel: string;
};

export type TradePartner = {
  rank: number;
  country: string;
  region: "LATAM" | "North America" | "Europe" | "Asia" | "Middle East" | "Africa";
};

export type TradeCategory = {
  rank: number;
  label: string;
  valueUsdBillions: number;
};

export type TradeShowResult = {
  id: string;
  show: string;
  window: string;
  reportedSalesUsdMillions: number;
};

export type TradeSection = {
  headline: string;
  asOf: string;
  releaseDate: string;
  releaseTitle: string;
  releaseUrl: string;
  heroMetrics: TradeHeadlineMetric[];
  deltas: TradeDelta[];
  topMarkets: TradePartner[];
  topCategories: TradeCategory[];
  selectFlorida: {
    headline: string;
    businessesServed: number;
    businessesWindow: string;
    salesGeneratedUsdMillions: number;
    showResults: TradeShowResult[];
  };
  bilateralTrade: {
    label: string;
    valueUsdBillions: number;
    oneYearAbsoluteUsdBillions: number;
    oneYearPercent: number;
    sevenYearAbsoluteUsdBillions: number;
    sevenYearPercent: number;
  };
  narrative: {
    headline: string;
    whatStandsOut: string[];
    watchOuts: string[];
    whyItMatters: string[];
  };
};

export type DashboardDataset = {
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
  scorecard2030: InsightSection;
  brainNotes: FloridaBrainNote[];
  strategy: StrategyLayer;
  competition: StateCompetitionLayer;
  federal: FederalDataLayer;
  terminal: TerminalLayer;
  distinctives: {
    snowbirdIndex: InsightSection;
    spaceCoastCadence: InsightSection;
    latamGateway: InsightSection;
  };
  trade: TradeSection;
};
