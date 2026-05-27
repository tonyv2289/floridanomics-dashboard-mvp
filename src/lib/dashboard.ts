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
    description: "The statewide labor-market read, from payrolls to metro pulse.",
  },
  {
    id: "innovation",
    label: "Innovation + Econ Dev",
    description: "Formation, advanced employment, output, and the support stack behind it.",
  },
  {
    id: "trade",
    label: "International Trade",
    description: "Exports, categories, gateway positioning, and SelectFlorida outcomes.",
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
  switch (metric.id) {
    case "unemploymentRate":
      return `Up ${Math.abs(metric.deltas.oneYear?.absolute ?? 0).toFixed(1)} points from ${formatDateLabel(metric.deltas.oneYear?.baseDate ?? metric.latest.date, { month: "long", year: "numeric" })}. Florida is still below the classic 5% stress line, but the labor market is clearly looser than a year ago.`;
    case "laborForce":
      return `The labor force is still larger than a year ago by ${formatCompact(Math.abs(metric.deltas.oneYear?.absolute ?? 0), 1)} people. Florida is still attracting workers even while hiring momentum cools.`;
    case "nonfarmPayrolls":
      return `Payrolls are down ${formatCompact(Math.abs(displayValue(metric, metric.deltas.oneYear?.absolute ?? 0)), 1)} from a year ago. That is the cleanest sign that migration alone is not enough to carry the hiring story.`;
    case "population":
      return `Population is still up ${formatCompact(Math.abs(metric.deltas.oneYear?.absolute ?? 0), 1)} year over year. Demand for housing, services, and infrastructure keeps compounding underneath the labor cycle.`;
    case "employmentLevel":
      return `Employment is below the year-ago mark by ${formatCompact(Math.abs(metric.deltas.oneYear?.absolute ?? 0), 1)} people. More residents are here, but fewer are working than the migration story alone would suggest.`;
    default:
      return "The headline matters less than the direction of the trend. Florida still rewards close reading.";
  }
}

export function buildCoreMetricChartInterpretation(metric: AnyMetric): string {
  switch (metric.id) {
    case "unemploymentRate":
      return `This chart is the fastest reality check in the app. Florida's unemployment rate has climbed from the 2023 lows, which means the state's labor market is no longer running on pure momentum.`;
    case "laborForce":
      return "Florida's growth story still starts with people. A rising labor force means the state is still pulling workers in even while employers slow down.";
    case "nonfarmPayrolls":
      return "This is the chart to watch if you want the hard employer read. Payrolls have flattened enough that any Florida boom narrative now needs sector detail behind it.";
    case "population":
      return "Population is the long-duration Florida advantage. It does not rescue every short-cycle slowdown, but it keeps the demand base moving in one direction.";
    case "employmentLevel":
      return "Employment has not kept up with the population story. That gap is why the dashboard keeps labor, migration, and industry mix in the same frame.";
    default:
      return buildCoreMetricInterpretation(metric);
  }
}

export function buildInnovationMetricInterpretation(metric: Metric): string {
  switch (metric.id) {
    case "businessApplications":
      return "Formation is still outrunning the labor market. Florida keeps producing new companies even while mature hiring and construction soften.";
    case "informationEmployment":
      return "This is the wobble inside the knowledge-work layer. If Florida wants a deeper tech bench, information employment cannot keep slipping while startups rise.";
    case "professionalBusinessEmployment":
      return "This is still one of the state's biggest advanced-services bases, but the line is flatter than the marketing copy. Florida has scale here, not escape velocity.";
    case "realGsp":
      return "Output is still growing, which matters. Florida's innovation story is broader than venture headlines, and real output is the least hype-prone proof point.";
    case "constructionEmployment":
      return "Construction is the warning light in an expansion state. When buildout slows in Florida, it usually hits confidence well before it hits branding.";
    default:
      return "The innovation stack needs one focal signal at a time. This chart is the operating read, not background decoration.";
  }
}

export function buildIndustryInterpretation(dataset: DashboardDataset): string {
  const topGrower = dataset.industry.strongestGrowers[0];
  const biggestLaggard = dataset.industry.laggards[0];

  return `${topGrower.label} is carrying the strongest growth print at ${topGrower.deltas.oneYear?.percent?.toFixed(1) ?? "n/a"}% year over year, while ${biggestLaggard.label} is the weakest line at ${biggestLaggard.deltas.oneYear?.percent?.toFixed(1) ?? "n/a"}%. Florida is still expanding, but the composition of growth is narrower than the population story suggests.`;
}

export function buildMetroComparisonInterpretation(dataset: DashboardDataset, selectedMetroId: string): string {
  const metros = [...dataset.metros].sort((a, b) => a.unemploymentRate.latest.value - b.unemploymentRate.latest.value);
  const tightest = metros[0];
  const loosest = metros[metros.length - 1];
  const selected = dataset.metros.find((metro) => metro.id === selectedMetroId) ?? tightest;

  return `${tightest.name} is still the tightest major labor market at ${tightest.unemploymentRate.latest.value.toFixed(1)}%, while ${loosest.name} is the loosest at ${loosest.unemploymentRate.latest.value.toFixed(1)}%. ${selected.name} matters because local execution in Florida still happens metro by metro, not statewide.`;
}

export function buildMetroCardInterpretation(dataset: DashboardDataset, metroId: string): string {
  const metro = dataset.metros.find((entry) => entry.id === metroId);
  const statewide = dataset.metrics.unemploymentRate.latest.value;

  if (!metro) {
    return "Each metro carries its own labor cycle. The statewide read only gets you part of the way.";
  }

  const gap = metro.unemploymentRate.latest.value - statewide;
  if (Math.abs(gap) < 0.15) {
    return `This metro is tracking close to the statewide unemployment rate of ${statewide.toFixed(1)}%. It is a useful baseline read, not an outlier.`;
  }

  if (gap < 0) {
    return `This metro is tighter than the statewide labor market by ${Math.abs(gap).toFixed(1)} points. It is still absorbing workers better than Florida overall.`;
  }

  return `This metro is looser than the statewide labor market by ${gap.toFixed(1)} points. If conditions weaken further, this geography will feel it before the statewide average does.`;
}

export function buildTradeCategoryInterpretation(dataset: DashboardDataset): string {
  const topCategory = dataset.trade.topCategories[0];

  return `${topCategory.label} alone accounts for $${topCategory.valueUsdBillions.toFixed(1)}B, and the rest of the top five still leans toward advanced manufactured goods. That keeps Florida's export mix specific, not generic.`;
}

export function buildTradeDeltaInterpretation(delta: DashboardDataset["trade"]["deltas"][number]): string {
  switch (delta.id) {
    case "oneYear":
      return "This is the cleanest year-over-year expansion read in the trade stack. Florida added real export volume, not just narrative heat.";
    case "sevenYear":
      return "The pre-2018 comparison matters because it shows this is a larger machine now, not just a one-year spike.";
    case "fiscalYear":
      return "SelectFlorida's measured pipeline is still scaling. That is operating leverage, not macro luck.";
    case "mfgShare":
      return "Manufacturing is doing almost all of the heavy lifting. That is a strength, and it is also concentration risk.";
    default:
      return "The delta matters because Florida's trade story only works if the growth is durable.";
  }
}

export function buildTradeHeroInterpretation(metricId: string): string {
  switch (metricId) {
    case "totalExports":
      return "Record exports matter because they prove Florida is shipping real goods, not just importing growth narratives.";
    case "manufacturedExports":
      return "Manufacturing is doing most of the work in this trade story. That is why aerospace and industrial capacity matter so much to Florida.";
    case "bilateralTrade":
      return "This is the logistics moat in one number. Florida's ports and airports are moving enough volume to make the gateway claim tangible.";
    case "selectFloridaFy":
      return "This is measured execution, not aspiration. Florida can point to transaction outcomes, not just conference slogans.";
    default:
      return "The trade stack only matters if it converts headline volume into durable economic position.";
  }
}
