import type { DashboardDataset, StateInvestmentMeasure } from "../types/dashboard";
import type { CountyBenchmark } from "../regions/geographies";
import { REGION_COUNTIES } from "../regions/geographies";
import { REGIONAL_PROFILES, regionalPath } from "../regions/profiles";
import { formatStateValue, ordinal } from "../v3/state-investment";

// Everything the homepage shows is derived here from the published datasets, so it stays current as the data refreshes.

export type LabelSide = "l" | "r" | "t";
export type HomeCounty = { fips: string; name: string; jobs: number; weeklyWage: number; change: number | null; lonLat: [number, number]; side: "l" | "r" };
export type HomeRegion = {
  id: string;
  title: string;
  short: string;
  href: string;
  center: [number, number];
  zoom: number;
  radius: number;
  label: LabelSide;
  counties: HomeCounty[];
  note: string;
};
export type HomeStat = { value: string; label: string; delta: string | null; tone: "up" | "down" | null };
export type HomeFigure = { value: string; label: string; context: string; source: { label: string; url: string } | null };
export type HomeBar = { label: string; value: string; share: number };
export type HomeLedgerRow = { id: string; label: string; period: string; value: string; rank: string; position: number; rankOf: number };
export type HomeModel = {
  hero: HomeStat[];
  heroSources: Array<{ label: string; url: string }>;
  regions: HomeRegion[];
  countyPeriod: string;
  countyCount: number;
  climb: {
    years: number[];
    florida: number[];
    median: number[];
    ranks: number[];
    counts: number[];
    title: string;
    body: string;
    source: { label: string; url: string } | null;
  } | null;
  launches: { count: number; year: string; line: string; extras: HomeFigure[]; source: HomeFigure["source"] } | null;
  ports: { total: string; line: string; bars: HomeBar[]; aside: HomeFigure | null; source: HomeFigure["source"] } | null;
  migration: { value: string; line: string; bars: HomeBar[]; note: string; source: HomeFigure["source"] } | null;
  ledger: HomeLedgerRow[];
};

// Travel order: west to east across the north, then down the peninsula. Centers and zoom place the map camera;
// radius (projected degrees) sets how far the highlight spreads.
const REGION_ORDER: Array<{ id: string; short: string; center: [number, number]; zoom: number; radius: number; label: LabelSide }> = [
  { id: "panhandle", short: "Panhandle", center: [-86.45, 30.52], zoom: 3.0, radius: 1.25, label: "r" },
  { id: "north-central", short: "North Central", center: [-83.3, 30.05], zoom: 2.7, radius: 1.3, label: "l" },
  { id: "northeast", short: "Northeast", center: [-81.55, 30.12], zoom: 3.6, radius: 0.7, label: "r" },
  { id: "orlando-osceola", short: "Orlando", center: [-81.24, 28.3], zoom: 3.8, radius: 0.62, label: "t" },
  { id: "space-coast", short: "Space Coast", center: [-80.72, 28.26], zoom: 3.8, radius: 0.55, label: "r" },
  { id: "tampa-bay", short: "Tampa Bay", center: [-82.5, 28.02], zoom: 3.6, radius: 0.66, label: "l" },
  { id: "southwest", short: "Southwest", center: [-81.72, 26.5], zoom: 3.3, radius: 0.8, label: "l" },
  { id: "south-florida", short: "South Florida", center: [-80.47, 26.12], zoom: 3.1, radius: 0.8, label: "r" },
];

// Approximate county centers for map pins (longitude, latitude); Pinellas labels to its Gulf side.
const COUNTY_POINTS: Record<string, [number, number]> = {
  "12033": [-87.34, 30.61], "12091": [-86.59, 30.66], "12005": [-85.63, 30.24], "12073": [-84.28, 30.46], "12001": [-82.36, 29.67],
  "12031": [-81.66, 30.33], "12109": [-81.41, 29.91], "12095": [-81.32, 28.51], "12097": [-81.15, 28.06], "12009": [-80.73, 28.26],
  "12057": [-82.35, 27.91], "12103": [-82.74, 27.9], "12101": [-82.45, 28.3], "12015": [-81.93, 26.9], "12071": [-81.86, 26.55],
  "12021": [-81.4, 26.1], "12099": [-80.44, 26.65], "12011": [-80.45, 26.15], "12086": [-80.5, 25.61],
};
const LEFT_LABELS = new Set(["12103"]);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const int = (value: number) => Math.round(value).toLocaleString("en-US");
const signedInt = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${int(Math.abs(value))}`;
const pct = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`;
const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export function formatCountyChange(value: number | null): string {
  return value === null ? "n/a" : pct(value);
}

function heroStats(data: DashboardDataset): { stats: HomeStat[]; sources: Array<{ label: string; url: string }> } {
  const { nonfarmPayrolls: payrolls, unemploymentRate: rate, population } = data.metrics;
  const stats: HomeStat[] = [];
  const payrollDelta = payrolls.deltas?.oneYear?.absolute;
  stats.push({
    value: int(payrolls.latest.value * 1000),
    label: `Payroll jobs, ${monthYear(payrolls.latest.date)}`,
    delta: payrollDelta == null ? null : `${signedInt(payrollDelta * 1000)} in a year`,
    tone: payrollDelta == null ? null : payrollDelta >= 0 ? "up" : "down",
  });
  const rateDelta = rate.deltas?.oneYear?.absolute;
  stats.push({
    value: `${rate.latest.value.toFixed(1)}%`,
    label: `Unemployment, ${monthYear(rate.latest.date)}`,
    delta: rateDelta == null ? null : `${rateDelta > 0 ? "+" : rateDelta < 0 ? "−" : ""}${Math.abs(rateDelta).toFixed(1)} pts in a year`,
    tone: rateDelta == null || Math.abs(rateDelta) < 0.05 ? null : rateDelta > 0 ? "down" : "up",
  });
  const popDelta = population.deltas?.oneYear?.absolute;
  stats.push({
    value: int(population.latest.value),
    label: `Residents, ${population.latest.date.slice(0, 4)}`,
    delta: popDelta == null ? null : `${signedInt(popDelta)} in a year`,
    tone: popDelta == null ? null : popDelta >= 0 ? "up" : "down",
  });
  const exports = data.trade.heroMetrics.find((metric) => /total florida exports/i.test(metric.label));
  if (exports) {
    const year = exports.label.match(/\((\d{4})\)/)?.[1] ?? "";
    stats.push({
      value: `$${exports.value.toFixed(1)}B`,
      label: `Exports of Florida goods${year ? `, ${year}` : ""}${/record/i.test(data.trade.releaseTitle ?? "") ? ", a record" : ""}`,
      delta: null,
      tone: null,
    });
  }
  const sources = [
    { label: "BLS payrolls", url: "https://www.bls.gov/sae/" },
    { label: "BLS unemployment", url: "https://www.bls.gov/lau/" },
    { label: "Census population via FRED", url: "https://fred.stlouisfed.org/series/FLPOP" },
  ];
  if (exports && data.trade.releaseUrl) sources.push({ label: "FloridaCommerce exports", url: data.trade.releaseUrl });
  return { stats, sources };
}

type DistinctiveStat = { label: string; value: string; context?: string; note?: string; source?: { label: string; url: string } };
function distinctiveStats(data: DashboardDataset, key: string): DistinctiveStat[] {
  const block = (data.distinctives as unknown as Record<string, { stats?: DistinctiveStat[] }> | undefined)?.[key];
  return Array.isArray(block?.stats) ? block.stats : [];
}

// Numbers printed as text in the data ("1.115M TEUs", "$3.3B"): returns the value in units, or null.
export function parseScaled(text: string): number | null {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);
  if (!match) return null;
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] ?? "").toUpperCase() as "K" | "M" | "B"] ?? 1;
  return Number(match[1]) * scale;
}

const figure = (stat: DistinctiveStat): HomeFigure => ({ value: stat.value, label: stat.label, context: stat.context ?? "", source: stat.source ?? null });

function regionDistinctive(id: string, data: DashboardDataset): string | null {
  if (id === "space-coast") {
    const stat = distinctiveStats(data, "spaceCoastCadence").find((item) => /^launches in \d{4}$/i.test(item.label));
    if (!stat) return null;
    return `${stat.value} launches in ${stat.label.slice(-4)}${/record/i.test(stat.context ?? "") ? ", a record" : ""}.`;
  }
  if (id === "south-florida") {
    const stat = distinctiveStats(data, "latamGateway").find((item) => /^portmiami container/i.test(item.label));
    const fy = stat?.context?.match(/FY(\d{4})/)?.[1];
    return stat && fy ? `PortMiami moved ${stat.value} in fiscal ${fy}.` : null;
  }
  if (id === "southwest") {
    const stat = distinctiveStats(data, "snowbirdIndex").find((item) => /^collier net income migration$/i.test(item.label));
    const year = stat?.context?.match(/\b(20\d\d)\b/)?.[1];
    return stat && year ? `Collier gained ${stat.value} in net income migration in ${year}, from IRS data.` : null;
  }
  return null;
}

export function buildRegions(counties: CountyBenchmark[], data: DashboardDataset): HomeRegion[] {
  const byFips = new Map(counties.map((county) => [county.fips, county]));
  const regions = REGION_ORDER.map((config) => {
    const profile = REGIONAL_PROFILES.find((item) => item.id === config.id);
    const members = (REGION_COUNTIES[config.id] ?? [])
      .map(({ fips }) => byFips.get(fips))
      .filter((county): county is CountyBenchmark => Boolean(county && COUNTY_POINTS[county.fips]))
      .map((county) => ({
        fips: county.fips,
        name: county.name,
        jobs: county.jobs,
        weeklyWage: county.weeklyWage,
        change: county.employmentChangePercent,
        lonLat: COUNTY_POINTS[county.fips],
        side: LEFT_LABELS.has(county.fips) ? ("l" as const) : ("r" as const),
      }));
    return { ...config, title: profile?.title ?? config.short, href: regionalPath(config.id, import.meta.env?.BASE_URL ?? "/"), counties: members, note: "" };
  });
  const all = regions.flatMap((region) => region.counties);
  const withChange = all.filter((county) => county.change !== null);
  const fastest = withChange.length ? withChange.reduce((a, b) => ((b.change ?? 0) > (a.change ?? 0) ? b : a)) : null;
  const topWage = all.length ? all.reduce((a, b) => (b.weeklyWage > a.weeklyWage ? b : a)) : null;
  for (const region of regions) {
    const parts: string[] = [];
    if (fastest && region.counties.includes(fastest) && (fastest.change ?? 0) > 0) {
      parts.push(`${fastest.name} grew jobs ${Math.abs(fastest.change ?? 0).toFixed(1)}% over the year, the fastest of the ${all.length} benchmark counties.`);
    } else if (topWage && region.counties.includes(topWage)) {
      parts.push(`${topWage.name} pays the highest average weekly wage of the ${all.length} benchmark counties, $${int(topWage.weeklyWage)}.`);
    }
    const distinctive = regionDistinctive(region.id, data);
    if (distinctive) parts.push(distinctive);
    if (!parts.length && region.counties.length > 1) {
      const top = region.counties.reduce((a, b) => (b.weeklyWage > a.weeklyWage ? b : a));
      parts.push(`${top.name} pays the region's highest average weekly wage, $${int(top.weeklyWage)}.`);
    } else if (!parts.length && region.counties.length === 1) {
      parts.push(`${region.counties[0].name} pays $${int(region.counties[0].weeklyWage)} a week on average.`);
    }
    region.note = parts.join(" ");
  }
  return regions;
}

function climbModel(data: DashboardDataset): HomeModel["climb"] {
  const history = data.competition.stateInvestment?.facilityHistory;
  const florida = history?.states.find((row) => row.state === "Florida");
  if (!history || !florida || history.years.length < 2) return null;
  const last = history.years.length - 1;
  const below = florida.perMillion[last] < history.medianPerMillion[last];
  const sources = new Map(data.competition.sources.map((source) => [source.id, source]));
  const source = sources.get(`si_site_selection_${history.years[last]}`) ?? null;
  return {
    years: history.years,
    florida: florida.perMillion,
    median: history.medianPerMillion,
    ranks: florida.rankPerMillion,
    counts: florida.projects,
    title: `From ${ordinal(florida.rankPerMillion[0])} to ${ordinal(florida.rankPerMillion[last])} per resident.`,
    body:
      `Site Selection counts every new or expanded facility that clears its threshold. Florida's count went from ${int(florida.projects[0])} to ` +
      `${int(florida.projects[last])}, ${ordinal(florida.rankProjects[last])} in the nation in ${history.years[last]}. Per resident, it sits ` +
      `${below ? "below" : "above"} the 50-state median.`,
    source: source ? { label: "Site Selection Governor's Cups", url: source.url } : null,
  };
}

function launchesModel(data: DashboardDataset): HomeModel["launches"] {
  const stats = distinctiveStats(data, "spaceCoastCadence");
  const launch = stats.find((item) => /^launches in \d{4}$/i.test(item.label));
  const count = launch ? Number.parseInt(launch.value.replace(/,/g, ""), 10) : Number.NaN;
  if (!launch || !Number.isFinite(count) || count <= 0 || count > 400) return null;
  const year = launch.label.slice(-4);
  const extras = stats.filter((item) => item !== launch && !/cumulative/i.test(item.label)).slice(0, 2).map(figure);
  return {
    count,
    year,
    line: `launches from Florida's Space Coast in ${year}${/record/i.test(launch.context ?? "") ? ", a record year" : ""}.`,
    extras,
    source: launch.source ?? null,
  };
}

function portsModel(data: DashboardDataset): HomeModel["ports"] {
  const stats = distinctiveStats(data, "latamGateway");
  const flows = stats.filter((item) => /container flow/i.test(item.label));
  const values = flows.map((item) => parseScaled(item.value));
  if (flows.length < 1 || values.some((value) => value === null)) return null;
  const nums = values as number[];
  const max = Math.max(...nums);
  const total = nums.reduce((a, b) => a + b, 0);
  const fy = flows[0].context?.match(/FY(\d{4})/)?.[1];
  const names = flows.map((item) => item.label.replace(/\s*container flow/i, ""));
  const preliminary = flows.filter((item) => /preliminary/i.test(item.context ?? "")).map((item) => item.label.replace(/\s*container flow/i, ""));
  const share = stats.find((item) => /share/i.test(item.label));
  return {
    total: `${(total / 1e6).toFixed(2)}M`,
    line: `containers, in twenty-foot equivalent units, through ${names.join(" and ")}${fy ? ` in fiscal ${fy}` : ""}.${preliminary.length ? ` ${preliminary.join(" and ")} figure is preliminary.` : ""}`,
    bars: flows
      .map((_, index) => ({ label: names[index], value: `${int(nums[index])} TEUs`, share: nums[index] / max }))
      .sort((a, b) => b.share - a.share),
    aside: share ? figure(share) : null,
    source: flows[0].source ?? null,
  };
}

function migrationModel(data: DashboardDataset): HomeModel["migration"] {
  const stats = distinctiveStats(data, "snowbirdIndex");
  const hourly = stats.find((item) => /^net income migration$/i.test(item.label));
  if (!hourly) return null;
  const counties = stats.filter((item) => /\bnet income migration$/i.test(item.label) && item !== hourly);
  const values = counties.map((item) => parseScaled(item.value));
  const max = Math.max(...values.map((value) => value ?? 0), 1);
  const year = counties[0]?.context?.match(/\b(20\d\d)\b/)?.[1];
  return {
    value: hourly.value.replace(/\s*\/\s*hr$/i, ""),
    line: `${/\/\s*hr$/i.test(hourly.value) ? "an hour " : ""}in net income migration, the income of people moving to Florida minus those leaving, from IRS data expressed per hour by the Florida Scorecard.`,
    bars: counties
      .map((item, index) => ({ label: item.label.replace(/\s*net income migration$/i, " County"), value: item.value, share: (values[index] ?? 0) / max }))
      .filter((bar) => bar.share > 0),
    note: year ? `County figures are net income migration in ${year}, IRS data as rounded by the Florida Chamber.` : "",
    source: hourly.source ?? null,
  };
}

function ledgerModel(data: DashboardDataset): HomeLedgerRow[] {
  const measures: StateInvestmentMeasure[] = data.competition.stateInvestment?.measures ?? [];
  return measures
    .map((measure) => ({
      id: measure.id,
      label: measure.label,
      period: measure.period,
      value: formatStateValue(measure.florida.value, measure.format),
      rank: `${ordinal(measure.florida.rank)} of ${measure.florida.rankOf}`,
      rankOf: measure.florida.rankOf,
      position: measure.florida.rankOf > 1 ? (measure.florida.rank - 1) / (measure.florida.rankOf - 1) : 0,
    }))
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
}

export function buildHomeModel(data: DashboardDataset, regional: { counties: CountyBenchmark[]; period: string; employmentMonth: string }): HomeModel {
  const { stats, sources } = heroStats(data);
  const regions = buildRegions(regional.counties, data);
  const month = regional.employmentMonth;
  return {
    hero: stats,
    heroSources: sources,
    regions,
    countyCount: regions.reduce((sum, region) => sum + region.counties.length, 0),
    countyPeriod: `Jobs in ${monthYear(month)} and change from a year earlier; average weekly wage, ${regional.period.replace(/^Q(\d) (\d{4})$/, (_, q: string, y: string) => `${["first", "second", "third", "fourth"][Number(q) - 1]} quarter ${y}`)}.`,
    climb: climbModel(data),
    launches: launchesModel(data),
    ports: portsModel(data),
    migration: migrationModel(data),
    ledger: ledgerModel(data),
  };
}
