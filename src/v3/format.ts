import { type AnyMetric, formatCompact } from "../lib/dashboard";
import type {
  CompetitionArrowDirection,
  DashboardDataset,
  PeerStateSnapshot,
} from "../types/dashboard";

export function formatDisplayedValue(metric: AnyMetric, value: number): string {
  if (metric.unit === "percent") {
    return `${value.toFixed(1)}%`;
  }

  if (metric.unit === "usd_millions") {
    return `$${formatCompact(value, 1)}`;
  }

  return formatCompact(value, 1);
}

export function getMonthlyPayrollChange(dataset: DashboardDataset): number {
  const series = dataset.metrics.nonfarmPayrolls.series;
  const latest = series[series.length - 1];
  const prior = series[series.length - 2] ?? latest;

  if (!latest || !prior) {
    return 0;
  }

  return Math.round((latest.value - prior.value) * 1000);
}

export function formatSignedInteger(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toLocaleString()}`;
}

export function formatSignedCompact(value: number, maxFractionDigits = 1): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCompact(Math.abs(value), maxFractionDigits)}`;
}

export function formatSignedPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function formatUsdValue(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${formatCompact(value / 1_000_000_000, 1)}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${formatCompact(value / 1_000_000, 1)}M`;
  }

  return `$${value.toLocaleString()}`;
}

export function formatFdiStock(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return `$${value >= 100 ? value.toFixed(0) : value.toFixed(1)}B`;
}

export function formatNullableUsdBillions(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  if (Math.abs(value) < 0.1) {
    return `$${Math.round(value * 1000)}M`;
  }

  return `$${value.toFixed(1)}B`;
}

export function formatNullableThousands(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  return `${value.toFixed(1)}k`;
}

export function formatNullablePercent(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  return `${value.toFixed(1)}%`;
}

export function formatNullableSignedPercent(value: number | null): string {
  if (value === null) {
    return "suppressed";
  }

  return formatSignedPercentage(value);
}

export function getMomentumArrow(
  momentum: DashboardDataset["competition"]["fdiScoreboard"]["observatory"]["deltas"][number]["momentum"],
): string {
  if (momentum === "accelerating") {
    return "↑";
  }

  if (momentum === "slowing") {
    return "↓";
  }

  if (momentum === "suppressed") {
    return "•";
  }

  return "→";
}

export function getDirectionArrow(direction: CompetitionArrowDirection): string {
  if (direction === "up") {
    return "↑";
  }

  if (direction === "down") {
    return "↓";
  }

  if (direction === "neutral") {
    return "•";
  }

  return "→";
}

export function formatPeerPayrollDelta(state: PeerStateSnapshot): string {
  const delta = state.nonfarmPayrolls.deltas.oneYear;
  if (!delta) {
    return "n/a";
  }

  return `${formatSignedCompact(delta.absolute * 1000, 1)} (${formatSignedPercentage(delta.percent)})`;
}

export function formatPeerLaborForceDelta(state: PeerStateSnapshot): string {
  const delta = state.laborForce.deltas.oneYear;
  if (!delta) {
    return "n/a";
  }

  return `${formatSignedCompact(delta.absolute, 1)} (${formatSignedPercentage(delta.percent)})`;
}

export function formatPeerUnemploymentDelta(state: PeerStateSnapshot): string {
  const delta = state.unemploymentRate.deltas.oneYear;
  if (!delta) {
    return "n/a";
  }

  const sign = delta.absolute >= 0 ? "+" : "-";
  return `${sign}${Math.abs(delta.absolute).toFixed(1)} pp`;
}

export function firstSentence(value: string): string {
  const [sentence] = value.split(". ");
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

export function resolveHref(href: string): string {
  if (/^https?:\/\//.test(href)) {
    return href;
  }

  return `${import.meta.env.BASE_URL}${href.replace(/^\/+/, "")}`;
}
