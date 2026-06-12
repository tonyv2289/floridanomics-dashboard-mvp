import type {
  DashboardDataset,
  Metric,
  MetricUnit,
  PopulationMetric,
} from "../../src/types/dashboard";
import { formatCompact } from "../../src/lib/dashboard";

export type ChangeScope = "labor" | "innovation" | "industry" | "metro";

export type ChangeItem = {
  id: string;
  label: string;
  kind: "new_period" | "revision";
  scope: ChangeScope;
  prevDate: string;
  nextDate: string;
  prevValue: number;
  nextValue: number;
  absolute: number;
  tone: "good" | "warn" | "flat";
  headline: string;
};

export type WhatChangedPayload = {
  generatedAt: string;
  period: string;
  prevPeriod: string;
  items: ChangeItem[];
};

type DiffableMetric = Pick<Metric, "label" | "unit" | "trendDirection" | "latest">;

const FLAT_EPSILON = 1e-9;

export function monthLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatLevel(unit: MetricUnit, value: number): string {
  if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  }
  if (unit === "thousands_jobs") {
    return formatCompact(value * 1000, 1);
  }
  if (unit === "usd_millions") {
    return `$${formatCompact(value * 1_000_000, 1)}`;
  }
  return formatCompact(value, 1);
}

export function formatMove(unit: MetricUnit, absolute: number): string {
  const magnitude = Math.abs(absolute);
  if (unit === "percent") {
    return `${absolute >= 0 ? "up" : "down"} ${magnitude.toFixed(1)} points`;
  }
  const direction = absolute >= 0 ? "a gain of" : "a loss of";
  if (unit === "thousands_jobs") {
    return `${direction} ${formatCompact(magnitude * 1000, 1)} jobs`;
  }
  if (unit === "usd_millions") {
    return `${direction} $${formatCompact(magnitude * 1_000_000, 1)}`;
  }
  return `${direction} ${formatCompact(magnitude, 1)}`;
}

function toneFor(metric: Pick<DiffableMetric, "trendDirection">, absolute: number): ChangeItem["tone"] {
  if (Math.abs(absolute) < FLAT_EPSILON) {
    return "flat";
  }
  return (absolute > 0) === (metric.trendDirection === "up_good") ? "good" : "warn";
}

function newPeriodHeadline(metric: DiffableMetric, prevDate: string, nextDate: string, absolute: number): string {
  const verb = metric.unit === "percent" ? "moved to" : "reached";
  const level = formatLevel(metric.unit, metric.latest.value);
  const move = formatMove(metric.unit, absolute);
  return `${metric.label} ${verb} ${level} in ${monthLabel(nextDate)}, ${move} versus ${monthLabel(prevDate)}.`;
}

function revisionHeadline(metric: DiffableMetric, prevValue: number): string {
  const level = formatLevel(metric.unit, metric.latest.value);
  const prior = formatLevel(metric.unit, prevValue);
  return `${metric.label} for ${monthLabel(metric.latest.date)} was revised to ${level} from ${prior}.`;
}

export function diffMetric(
  scope: ChangeScope,
  id: string,
  prev: DiffableMetric,
  next: DiffableMetric,
): ChangeItem | null {
  const base = {
    id,
    label: next.label,
    scope,
    prevDate: prev.latest.date,
    nextDate: next.latest.date,
    prevValue: prev.latest.value,
    nextValue: next.latest.value,
  };

  if (next.latest.date > prev.latest.date) {
    const absolute = next.latest.value - prev.latest.value;
    return {
      ...base,
      kind: "new_period",
      absolute,
      tone: toneFor(next, absolute),
      headline: newPeriodHeadline(next, prev.latest.date, next.latest.date, absolute),
    };
  }

  if (next.latest.date === prev.latest.date && Math.abs(next.latest.value - prev.latest.value) > FLAT_EPSILON) {
    const absolute = next.latest.value - prev.latest.value;
    return {
      ...base,
      kind: "revision",
      absolute,
      tone: toneFor(next, absolute),
      headline: revisionHeadline(next, prev.latest.value),
    };
  }

  return null;
}

function metroChange(
  prevMetro: DashboardDataset["metros"][number] | undefined,
  nextMetro: DashboardDataset["metros"][number],
): ChangeItem | null {
  if (!prevMetro) {
    return null;
  }

  const prev = prevMetro.unemploymentRate.latest;
  const next = nextMetro.unemploymentRate.latest;
  if (next.date <= prev.date) {
    return null;
  }

  const absolute = next.value - prev.value;
  const tone: ChangeItem["tone"] =
    Math.abs(absolute) < FLAT_EPSILON ? "flat" : absolute < 0 ? "good" : "warn";

  return {
    id: `metro-${nextMetro.id}`,
    label: `${nextMetro.name} unemployment`,
    kind: "new_period",
    scope: "metro",
    prevDate: prev.date,
    nextDate: next.date,
    prevValue: prev.value,
    nextValue: next.value,
    absolute,
    tone,
    headline: `${nextMetro.name} unemployment ${absolute >= 0 ? "rose" : "eased"} to ${next.value.toFixed(1)}% in ${monthLabel(next.date)}, ${formatMove("percent", absolute).replace(/^(up|down) /, "$1 ")} versus ${monthLabel(prev.date)}.`,
  };
}

export function diffDatasets(prev: DashboardDataset, next: DashboardDataset): ChangeItem[] {
  const items: ChangeItem[] = [];

  const laborIds = ["nonfarmPayrolls", "unemploymentRate", "laborForce", "employmentLevel", "population"] as const;
  for (const id of laborIds) {
    const prevMetric = prev.metrics[id] as Metric | PopulationMetric | undefined;
    const nextMetric = next.metrics[id] as Metric | PopulationMetric | undefined;
    if (!prevMetric || !nextMetric) {
      continue;
    }
    const change = diffMetric("labor", id, prevMetric, nextMetric);
    if (change) {
      items.push(change);
    }
  }

  for (const [id, nextMetric] of Object.entries(next.innovation.metrics)) {
    const prevMetric = prev.innovation.metrics[id as keyof typeof prev.innovation.metrics];
    if (!prevMetric) {
      continue;
    }
    const change = diffMetric("innovation", id, prevMetric, nextMetric);
    if (change) {
      items.push(change);
    }
  }

  const sectorChanges: ChangeItem[] = [];
  const prevSectors = new Map(prev.industry.sectors.map((sector) => [sector.id, sector]));
  for (const sector of next.industry.sectors) {
    const prevSector = prevSectors.get(sector.id);
    if (!prevSector) {
      continue;
    }
    const change = diffMetric(
      "industry",
      `sector-${sector.id}`,
      { label: sector.label, unit: "thousands_jobs", trendDirection: "up_good", latest: prevSector.latest },
      { label: sector.label, unit: "thousands_jobs", trendDirection: "up_good", latest: sector.latest },
    );
    if (change) {
      sectorChanges.push(change);
    }
  }
  sectorChanges.sort((a, b) => Math.abs(b.absolute) - Math.abs(a.absolute));
  items.push(...sectorChanges.slice(0, 2));

  const metroChanges: ChangeItem[] = [];
  const prevMetros = new Map(prev.metros.map((metro) => [metro.id, metro]));
  for (const metro of next.metros) {
    const change = metroChange(prevMetros.get(metro.id), metro);
    if (change) {
      metroChanges.push(change);
    }
  }
  metroChanges.sort((a, b) => Math.abs(b.absolute) - Math.abs(a.absolute));
  items.push(...metroChanges.slice(0, 2));

  return items;
}

export function buildPayload(prev: DashboardDataset, next: DashboardDataset): WhatChangedPayload {
  return {
    generatedAt: next.generatedAt,
    period: next.asOfLaborMarket,
    prevPeriod: prev.asOfLaborMarket,
    items: diffDatasets(prev, next).slice(0, 8),
  };
}

export function renderMemoMarkdown(payload: WhatChangedPayload, siteUrl: string): string {
  const lines: string[] = [];
  lines.push(`# What changed: the ${payload.period} read`);
  lines.push("");
  lines.push(
    `*Generated ${payload.generatedAt.slice(0, 10)} by the Floridanomics data pipeline. Previous read: ${payload.prevPeriod}.*`,
  );
  lines.push("");

  const lead = payload.items.find((item) => item.id === "nonfarmPayrolls") ?? payload.items[0];
  if (lead) {
    lines.push(lead.headline);
    lines.push("");
    lines.push(
      "One month is a single data point. The more durable signal is whether hiring, business formation, migration, and trade are still moving in the same direction.",
    );
    lines.push("");
  }

  lines.push("## The numbers that moved");
  lines.push("");
  for (const item of payload.items) {
    lines.push(`- ${item.headline}`);
  }
  lines.push("");
  lines.push(`Full detail, charts, and sources: ${siteUrl}`);
  lines.push("");

  return lines.join("\n");
}
