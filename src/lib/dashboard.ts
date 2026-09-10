import type {
  DashboardDataset,
  Delta,
  InnovationMetricId,
  Metric,
  PopulationMetric,
} from "../types/dashboard";

export type AnyMetric = Metric | PopulationMetric;
export type CoreMetricId = keyof DashboardDataset["metrics"];
export type DashboardTabId = "scorecard" | "innovation" | "trade";
export type Tone = "good" | "warn" | "neutral";

export type LeadChip = {
  label: string;
  value: string;
  tone?: Tone;
};

export type DashboardLead = {
  eyebrow: string;
  title: string;
  value: string;
  tone: Tone;
  summary: string;
  source: string;
  nextRelease?: string;
  chips: LeadChip[];
};

export const CORE_METRIC_IDS: CoreMetricId[] = [
  "unemploymentRate",
  "laborForce",
  "employmentLevel",
  "nonfarmPayrolls",
  "population",
];

export const INNOVATION_METRIC_IDS: InnovationMetricId[] = [
  "informationEmployment",
  "professionalBusinessEmployment",
  "businessApplications",
  "realGsp",
  "constructionEmployment",
];

export const DASHBOARD_TABS: Array<{ id: DashboardTabId; label: string; description: string }> = [
  {
    id: "scorecard",
    label: "Florida Scorecard",
    description: "Statewide employment, payrolls and regional unemployment.",
  },
  {
    id: "innovation",
    label: "Innovation + Econ Dev",
    description: "Business applications, selected industries, economic output and research institutions.",
  },
  {
    id: "trade",
    label: "International Trade",
    description: "Export markets, product categories, port activity and reported SelectFlorida results.",
  },
];

export function isDashboardTabId(value: string | null): value is DashboardTabId {
  return value === "scorecard" || value === "innovation" || value === "trade";
}

export function isCoreMetricId(value: string | null): value is CoreMetricId {
  return value !== null && CORE_METRIC_IDS.includes(value as CoreMetricId);
}

export function isInnovationMetricId(value: string | null): value is InnovationMetricId {
  return value !== null && INNOVATION_METRIC_IDS.includes(value as InnovationMetricId);
}

export function displayValue(metric: AnyMetric, rawValue: number): number {
  if (metric.unit === "thousands_jobs") {
    return rawValue * 1000;
  }

  if (metric.unit === "usd_millions") {
    return rawValue * 1_000_000;
  }

  return rawValue;
}

export function formatCompact(value: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function formatMetricValue(metric: AnyMetric, rawValue: number): string {
  if (metric.unit === "percent") {
    return `${rawValue.toFixed(1)}%`;
  }

  if (metric.unit === "usd_millions") {
    return `$${formatCompact(displayValue(metric, rawValue), 1)}`;
  }

  return formatCompact(displayValue(metric, rawValue), 1);
}

export function formatDelta(metric: AnyMetric, delta: Delta | null): string {
  if (!delta) {
    return "n/a";
  }

  const sign = delta.absolute >= 0 ? "+" : "-";

  if (metric.unit === "percent") {
    return `${sign}${Math.abs(delta.absolute).toFixed(1)} pp`;
  }

  const absolute = displayValue(metric, Math.abs(delta.absolute));
  const percentLabel = delta.percent === null ? "n/a" : `${sign}${Math.abs(delta.percent).toFixed(1)}%`;

  if (metric.unit === "usd_millions") {
    return `${sign}$${formatCompact(absolute, 1)} (${percentLabel})`;
  }

  return `${sign}${formatCompact(absolute, 1)} (${percentLabel})`;
}

export function deltaTone(metric: AnyMetric, delta: Delta | null): Tone {
  if (!delta || Math.abs(delta.absolute) < 1e-9) {
    return "neutral";
  }

  const favorable = metric.trendDirection === "up_good" ? delta.absolute > 0 : delta.absolute < 0;
  return favorable ? "good" : "warn";
}

export function shortMonthLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatDateLabel(date: string, options: Intl.DateTimeFormatOptions = { dateStyle: "long" }): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options,
  }).format(new Date(date));
}

export function formatUsdBillions(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}T`;
  }

  if (value >= 1) {
    return `$${value.toFixed(1)}B`;
  }

  return `$${(value * 1000).toFixed(0)}M`;
}

export function formatUsdMillions(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}B`;
  }

  return `$${value.toFixed(0)}M`;
}

export function formatTradeHero(value: number, unit: "usd_billions" | "percent" | "count"): string {
  if (unit === "usd_billions") {
    return formatUsdBillions(value);
  }

  if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  }

  return value.toLocaleString();
}

export function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function formatSignedUsdBillions(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(1)}B`;
}

export function daysSince(dateValue: string): number {
  const from = new Date(dateValue);
  const to = new Date();
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function chartSeries(metric: AnyMetric): Array<{ date: string; label: string; value: number }> {
  return metric.series.map((point) => ({
    date: point.date,
    label: shortMonthLabel(point.date),
    value: displayValue(metric, point.value),
  }));
}

export function buildMetroComparisonData(dataset: DashboardDataset): Array<{ date: string; label: string; [key: string]: string | number }> {
  const rows = new Map<string, { date: string; label: string; [key: string]: string | number }>();

  for (const metro of dataset.metros) {
    for (const point of metro.unemploymentRate.sparkline) {
      const row = rows.get(point.date) ?? { date: point.date, label: shortMonthLabel(point.date) };
      row[metro.id] = point.value;
      rows.set(point.date, row);
    }
  }

  return [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function buildScorecardLead(dataset: DashboardDataset): DashboardLead {
  const payrolls = dataset.metrics.nonfarmPayrolls;
  const pLatest = payrolls.series[payrolls.series.length - 1];
  const pPrior = payrolls.series[payrolls.series.length - 2] ?? payrolls.series[0];
  const monthChangeJobs = Math.round((pLatest.value - pPrior.value) * 1000);
  const absJobs = Math.abs(monthChangeJobs);
  const sign = monthChangeJobs >= 0 ? "+" : "-";
  const unemployment = dataset.metrics.unemploymentRate;
  const laborForce = dataset.metrics.laborForce;
  const employment = dataset.metrics.employmentLevel;
  const tone: Tone = monthChangeJobs > 0 ? "good" : monthChangeJobs < 0 ? "warn" : "neutral";
  const monthName = formatDateLabel(pLatest.date, { month: "long", year: "numeric" });
  const nextRelease = new Date(pLatest.date);
  nextRelease.setUTCMonth(nextRelease.getUTCMonth() + 1);
  nextRelease.setUTCDate(15);

  return {
    eyebrow: `Florida Today | ${formatDateLabel(dataset.generatedAt)}`,
    title:
      tone === "good"
        ? "Florida is still absorbing workers, but the quality of the expansion matters more than the headline."
        : tone === "warn"
          ? "The state still has scale, but the hiring engine just flashed amber."
          : "The economy is still large, but the signal is no longer obvious from one number alone.",
    value: `${sign}${absJobs.toLocaleString()}`,
    tone,
    summary:
      tone === "good"
        ? `Nonfarm payrolls added ${absJobs.toLocaleString()} jobs in ${monthName}. Unemployment sits at ${unemployment.latest.value.toFixed(1)}%, while labor force and employment are still larger than a year ago.`
        : tone === "warn"
          ? `Nonfarm payrolls lost ${absJobs.toLocaleString()} jobs in ${monthName}. Unemployment is ${unemployment.latest.value.toFixed(1)}%, so the next question is whether labor force growth can keep outrunning payroll softness.`
          : `Payrolls were nearly flat in ${monthName}. The read belongs in the mix: unemployment at ${unemployment.latest.value.toFixed(1)}%, labor force still expanding, and employment still above year-ago levels.`,
    source: `BLS CES / LAUS | ${monthName}`,
    nextRelease: `Next release ${formatDateLabel(nextRelease.toISOString(), { month: "short", day: "numeric", year: "numeric" })}`,
    chips: [
      {
        label: "Unemployment",
        value: formatMetricValue(unemployment, unemployment.latest.value),
        tone: deltaTone(unemployment, unemployment.deltas.oneYear),
      },
      {
        label: "1Y labor force",
        value: formatDelta(laborForce, laborForce.deltas.oneYear),
        tone: deltaTone(laborForce, laborForce.deltas.oneYear),
      },
      {
        label: "1Y employment",
        value: formatDelta(employment, employment.deltas.oneYear),
        tone: deltaTone(employment, employment.deltas.oneYear),
      },
    ],
  };
}

export function buildInnovationLead(dataset: DashboardDataset): DashboardLead {
  const businessApps = dataset.innovation.metrics.businessApplications;
  const informationEmployment = dataset.innovation.metrics.informationEmployment;
  const professionalServices = dataset.innovation.metrics.professionalBusinessEmployment;
  const appDelta = businessApps.deltas.oneYear;
  const infoDelta = informationEmployment.deltas.oneYear;
  const tone: Tone = appDelta && (appDelta.percent ?? 0) > 0 ? "good" : "neutral";

  return {
    eyebrow: `Innovation Today | ${formatDateLabel(dataset.generatedAt)}`,
    title:
      tone === "good"
        ? "Company formation is still healthy, even while the knowledge-work layer is wobbling."
        : "Florida’s innovation stack is broad, but not every layer is expanding at the same speed.",
    value: appDelta?.percent === null || appDelta?.percent === undefined ? formatMetricValue(businessApps, businessApps.latest.value) : `${appDelta.percent >= 0 ? "+" : "-"}${Math.abs(appDelta.percent).toFixed(1)}%`,
    tone,
    summary: `Business applications are ${formatDelta(businessApps, appDelta)} year over year. Information employment is ${formatDelta(informationEmployment, infoDelta)}, while professional and business services remains Florida's largest advanced-services base.`,
    source: "BLS, Census Business Formation Statistics, FRED",
    chips: [
      {
        label: "Business applications",
        value: formatMetricValue(businessApps, businessApps.latest.value),
        tone: deltaTone(businessApps, appDelta),
      },
      {
        label: "Information jobs",
        value: formatMetricValue(informationEmployment, informationEmployment.latest.value),
        tone: deltaTone(informationEmployment, infoDelta),
      },
      {
        label: "Pro + business services",
        value: formatMetricValue(professionalServices, professionalServices.latest.value),
        tone: deltaTone(professionalServices, professionalServices.deltas.oneYear),
      },
    ],
  };
}

export function buildTradeLead(dataset: DashboardDataset): DashboardLead {
  const [totalExports, manufacturedExports, bilateralTrade] = dataset.trade.heroMetrics;

  return {
    eyebrow: `Trade Today | ${dataset.trade.asOf}`,
    title: dataset.trade.narrative.headline,
    value: formatTradeHero(totalExports.value, totalExports.unit),
    tone: "good",
    summary: `${totalExports.helper}. ${manufacturedExports.label} sits at ${formatTradeHero(manufacturedExports.value, manufacturedExports.unit)}, and ${bilateralTrade.helper.toLowerCase()}.`,
    source: `${dataset.trade.releaseTitle} | Released ${dataset.trade.releaseDate}`,
    chips: dataset.trade.heroMetrics.slice(1).map((metric) => ({
      label: metric.label,
      value: formatTradeHero(metric.value, metric.unit),
      tone: "neutral",
    })),
  };
}

export function buildCoreMetricInterpretation(metric: AnyMetric): string {
  const delta = metric.deltas.oneYear;
  if (delta?.absolute == null) return "A comparable year-earlier observation is unavailable.";
  const direction = delta.absolute > 0 ? "above" : delta.absolute < 0 ? "below" : "unchanged from";
  const change = formatCompact(Math.abs(displayValue(metric, delta.absolute)), 1);
  switch (metric.id) {
    case "unemploymentRate":
      return `The unemployment rate is ${Math.abs(delta.absolute).toFixed(1)} percentage points ${direction} its year-earlier level. It measures unemployed residents actively seeking work as a share of the labor force.`;
    case "laborForce":
      return `The labor force is ${change} people ${direction} its year-earlier level. Changes can reflect population growth and participation; this series does not isolate migration.`;
    case "nonfarmPayrolls":
      return `Florida employers report ${change} jobs ${direction} the year-earlier level. Payroll positions differ from the number of employed residents and are subject to revision.`;
    case "population":
      return `The annual population estimate is ${change} residents ${direction} the previous year. Population affects demand for housing, services, and infrastructure.`;
    case "employmentLevel":
      return `Resident employment is ${change} people ${direction} its year-earlier level. This household-based estimate counts employed residents, rather than jobs at Florida establishments.`;
    default:
      return "Compare the observation period, annual change, and source definition before drawing conclusions.";
  }
}

export function buildCoreMetricChartInterpretation(metric: AnyMetric): string {
  return buildCoreMetricInterpretation(metric);
}

export function buildInnovationMetricInterpretation(metric: Metric): string {
  switch (metric.id) {
    case "businessApplications":
      return "Applications indicate interest in starting a business. They are not counts of operating firms, employer businesses, or jobs created.";
    case "informationEmployment":
      return "The information sector includes publishing, telecommunications, and other activities. It is one part of Florida's technology workforce, not a comprehensive technology-job count.";
    case "professionalBusinessEmployment":
      return "This broad sector includes professional, management, administrative, and support services. Its employment cannot be attributed entirely to technology or AI.";
    case "realGsp":
      return "Inflation-adjusted output provides a measure of economic activity across industries. The annual period differs from the monthly employment series.";
    case "constructionEmployment":
      return "Construction employment helps assess building activity and workforce capacity. Permits, project schedules, and financing provide additional context.";
    default:
      return "Read this measure alongside its source definition and observation period.";
  }
}

export function buildIndustryInterpretation(dataset: DashboardDataset): string {
  const topGrower = dataset.industry.strongestGrowers[0];
  const biggestLaggard = dataset.industry.laggards[0];
  return `${topGrower.label} has the highest annual employment change among the sectors shown (${topGrower.deltas.oneYear?.percent?.toFixed(1) ?? "n/a"}%). ${biggestLaggard.label} has the lowest (${biggestLaggard.deltas.oneYear?.percent?.toFixed(1) ?? "n/a"}%). Sector differences help explain the statewide result.`;
}

export function buildMetroComparisonInterpretation(dataset: DashboardDataset, selectedMetroId: string): string {
  const selected = dataset.metros.find((metro) => metro.id === selectedMetroId) ?? dataset.metros[0];
  return `${selected.name} reports ${selected.unemploymentRate.latest.value.toFixed(1)}% unemployment. Metro rates shown here are not seasonally adjusted. Compare them with the same month a year earlier; the statewide headline is seasonally adjusted.`;
}

export function buildMetroCardInterpretation(dataset: DashboardDataset, metroId: string): string {
  const metro = dataset.metros.find((entry) => entry.id === metroId);
  if (!metro) return "Metro data describe local labor markets and use unadjusted monthly estimates.";
  const change = metro.unemploymentRate.deltas.oneYear?.absolute;
  if (change == null) return "A year-earlier metro comparison is unavailable.";
  return `Unemployment is ${Math.abs(change).toFixed(1)} percentage points ${change >= 0 ? "above" : "below"} the same month last year. Metro estimates are not seasonally adjusted.`;
}

export function buildTradeCategoryInterpretation(dataset: DashboardDataset): string {
  const topCategory = dataset.trade.topCategories[0];
  return `${topCategory.label} accounts for $${topCategory.valueUsdBillions.toFixed(1)} billion in the cited annual release. State export attribution does not establish where every product was manufactured.`;
}

export function buildTradeDeltaInterpretation(delta: DashboardDataset["trade"]["deltas"][number]): string {
  switch (delta.id) {
    case "oneYear":
    case "sevenYear":
      return "These comparisons use current-dollar merchandise export values from the same published release. They do not measure inflation-adjusted shipment volumes.";
    case "fiscalYear":
      return "SelectFlorida reports these sales for its trade-development programs. The fiscal year differs from the calendar-year statewide export series.";
    case "mfgShare":
      return "The share refers to manufactured product classifications in Florida-origin exports, not the share physically manufactured in Florida.";
    default:
      return "Use the stated period and definition when comparing trade values.";
  }
}

export function buildTradeHeroInterpretation(metricId: string): string {
  switch (metricId) {
    case "totalExports":
      return "Florida-origin merchandise exports use the Census origin-of-movement definition. The release date identifies the statistical vintage.";
    case "manufacturedExports":
      return "Manufactured goods account for most of the cited export value. Origin-of-movement data should not be treated as a direct measure of Florida manufacturing output.";
    case "bilateralTrade":
      return "Trade through Florida ports and airports includes goods produced or consumed outside the state and differs from Florida-origin exports.";
    case "selectFloridaFy":
      return "Reported program sales describe export assistance outcomes. They are not a return-on-investment calculation or an estimate of net economic impact.";
    default:
      return "Trade definitions, geography, and reporting periods determine which comparisons are valid.";
  }
}
