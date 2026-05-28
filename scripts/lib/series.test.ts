import { describe, expect, it } from "vitest";
import type { TimePoint } from "../../src/types/dashboard";
import {
  buildDeltas,
  computeDelta,
  deltaAbs,
  deltaMagnitude,
  getBasePoint,
  lastN,
  latestPoint,
  metricSeriesId,
  parseBlsMonthly,
  prettyMonth,
  statePayrollSeriesId,
  stateLausSeriesId,
} from "./series";

const series: TimePoint[] = [
  { date: "2021-01-01", value: 50 },
  { date: "2023-01-01", value: 80 },
  { date: "2025-01-01", value: 90 },
  { date: "2026-01-01", value: 100 },
];

describe("parseBlsMonthly", () => {
  it("keeps monthly periods, drops annual (M13) and non-numeric, and sorts ascending", () => {
    const parsed = parseBlsMonthly({
      seriesID: "X",
      data: [
        { year: "2025", period: "M01", value: "5.2" },
        { year: "2025", period: "M13", value: "5.0" },
        { year: "2024", period: "M12", value: "4.8" },
        { year: "2025", period: "M02", value: "n/a" },
      ],
    });

    expect(parsed).toEqual([
      { date: "2024-12-01", value: 4.8 },
      { date: "2025-01-01", value: 5.2 },
    ]);
  });
});

describe("getBasePoint", () => {
  it("returns the most recent point at or before the target date", () => {
    expect(getBasePoint(series, 1)).toEqual({ date: "2025-01-01", value: 90 });
    expect(getBasePoint(series, 5)).toEqual({ date: "2021-01-01", value: 50 });
  });

  it("returns null for an empty series", () => {
    expect(getBasePoint([], 1)).toBeNull();
  });
});

describe("computeDelta", () => {
  it("computes absolute and percent change against the base year", () => {
    const oneYear = computeDelta(series, 1);
    expect(oneYear?.absolute).toBe(10);
    expect(oneYear?.percent).toBeCloseTo(11.111, 2);
    expect(oneYear?.baseDate).toBe("2025-01-01");
  });

  it("returns null percent when the base value is zero (no divide-by-zero)", () => {
    const zeroBase: TimePoint[] = [
      { date: "2025-01-01", value: 0 },
      { date: "2026-01-01", value: 5 },
    ];
    expect(computeDelta(zeroBase, 1)?.percent).toBeNull();
  });
});

describe("buildDeltas", () => {
  it("produces one/three/five year deltas", () => {
    const deltas = buildDeltas(series);
    expect(deltas.oneYear?.absolute).toBe(10);
    expect(deltas.threeYear?.absolute).toBe(20);
    expect(deltas.fiveYear?.percent).toBe(100);
  });
});

describe("small helpers", () => {
  it("latestPoint returns the last point and throws when empty", () => {
    expect(latestPoint(series)).toEqual({ date: "2026-01-01", value: 100 });
    expect(() => latestPoint([])).toThrow();
  });

  it("lastN takes the trailing window without overflowing", () => {
    expect(lastN([1, 2, 3, 4], 2)).toEqual([3, 4]);
    expect(lastN([1, 2], 5)).toEqual([1, 2]);
  });

  it("deltaMagnitude/deltaAbs guard against null", () => {
    expect(deltaMagnitude(null)).toBe(Number.NEGATIVE_INFINITY);
    expect(deltaAbs(null)).toBe(0);
    expect(deltaAbs({ years: 1, baseDate: "x", absolute: 7, percent: null })).toBe(7);
  });

  it("prettyMonth renders a UTC-stable label", () => {
    expect(prettyMonth("2026-01-15")).toBe("January 2026");
  });
});

describe("BLS series-id builders", () => {
  it("assemble the documented id shapes", () => {
    expect(metricSeriesId("LAUMT12331000000000", "003")).toBe("LAUMT12331000000000003");
    expect(stateLausSeriesId("12", "003")).toBe("LASST120000000000003");
    expect(statePayrollSeriesId("12")).toBe("SMS12000000000000001");
  });
});
