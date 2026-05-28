import type { Delta, Metric, TimePoint } from "../../src/types/dashboard";

export type BlsPoint = {
  year: string;
  period: string;
  value: string;
};

export type BlsSeries = {
  seriesID: string;
  data: BlsPoint[];
};

export function metricSeriesId(root: string, measureCode: "003" | "005" | "006") {
  return `${root}${measureCode}`;
}

export function stateLausSeriesId(fips: string, measureCode: "003" | "005" | "006") {
  return `LASST${fips}000000000000${measureCode.slice(2)}`;
}

export function statePayrollSeriesId(fips: string) {
  return `SMS${fips}000000000000001`;
}

export function parseBlsMonthly(series: BlsSeries): TimePoint[] {
  return series.data
    .filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period))
    .map((d) => ({
      date: `${d.year}-${d.period.slice(1)}-01`,
      value: Number.parseFloat(d.value),
    }))
    .filter((d) => Number.isFinite(d.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getBasePoint(series: TimePoint[], yearsBack: number): TimePoint | null {
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

export function computeDelta(series: TimePoint[], yearsBack: 1 | 3 | 5): Delta | null {
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

export function buildDeltas(series: TimePoint[]): Metric["deltas"] {
  return {
    oneYear: computeDelta(series, 1),
    threeYear: computeDelta(series, 3),
    fiveYear: computeDelta(series, 5),
  };
}

export function latestPoint(series: TimePoint[]): TimePoint {
  const point = series.at(-1);
  if (!point) {
    throw new Error("No time points available for series");
  }
  return point;
}

export function lastN<T>(values: T[], size: number): T[] {
  return values.slice(Math.max(values.length - size, 0));
}

export function deltaMagnitude(delta: Delta | null): number {
  return delta?.percent ?? Number.NEGATIVE_INFINITY;
}

export function deltaAbs(delta: Delta | null): number {
  return delta?.absolute ?? 0;
}

export function prettyMonth(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
