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
  distinctives: {
    snowbirdIndex: InsightSection;
    spaceCoastCadence: InsightSection;
    latamGateway: InsightSection;
  };
  trade: TradeSection;
};
