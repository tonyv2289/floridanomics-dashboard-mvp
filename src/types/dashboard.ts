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
};
