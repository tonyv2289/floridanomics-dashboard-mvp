import { describe, expect, it } from "vitest";
import type { TimePoint } from "../../src/types/dashboard";
import { buildSignal, changeVsTrailingAverage, changeVsYearAgo } from "./leading";

function weekly(values: number[], startWeek = 0): TimePoint[] {
  return values.map((value, index) => {
    const day = new Date(Date.UTC(2025, 0, 4 + (startWeek + index) * 7));
    return { date: day.toISOString().slice(0, 10), value };
  });
}

describe("changeVsTrailingAverage", () => {
  it("compares the latest point against the prior window average", () => {
    const series = weekly([100, 100, 100, 100, 110]);
    const change = changeVsTrailingAverage(series, 4, "vs 4-week average");
    expect(change?.absolute).toBeCloseTo(10);
    expect(change?.percent).toBeCloseTo(10);
    expect(change?.label).toBe("vs 4-week average");
  });

  it("returns null when the series is too short", () => {
    expect(changeVsTrailingAverage(weekly([100, 110]), 4, "x")).toBeNull();
  });

  it("excludes the latest point from its own baseline", () => {
    const series = weekly([100, 200, 100, 200, 150]);
    const change = changeVsTrailingAverage(series, 4, "x");
    expect(change?.absolute).toBeCloseTo(0);
  });
});

describe("changeVsYearAgo", () => {
  it("finds the point a year back in a weekly series", () => {
    const series = weekly(Array.from({ length: 60 }, (_, i) => 100 + i));
    const change = changeVsYearAgo(series);
    expect(change).not.toBeNull();
    expect(change!.absolute).toBeGreaterThan(0);
  });

  it("returns null when history is shorter than a year", () => {
    expect(changeVsYearAgo(weekly([100, 105, 110]))).toBeNull();
  });
});

describe("buildSignal", () => {
  it("assembles a signal and trims the series", () => {
    const series = weekly(Array.from({ length: 120 }, (_, i) => 100 + (i % 7)));
    const signal = buildSignal({
      id: "test",
      label: "Test signal",
      cadence: "weekly",
      unit: "claims",
      trendDirection: "down_good",
      leads: "Leads something.",
      source: { label: "FRED", url: "https://example.com" },
      recentWindow: 4,
      recentLabel: "vs 4-week average",
      series,
    });

    expect(signal?.latest.value).toBe(series.at(-1)?.value);
    expect(signal?.series.length).toBeLessThanOrEqual(90);
    expect(signal?.changes.recent).not.toBeNull();
    expect(signal?.changes.yearOver).not.toBeNull();
  });

  it("returns null for an empty series", () => {
    expect(
      buildSignal({
        id: "x",
        label: "x",
        cadence: "weekly",
        unit: "claims",
        trendDirection: "down_good",
        leads: "x",
        source: { label: "x", url: "x" },
        recentWindow: 4,
        recentLabel: "x",
        series: [],
      }),
    ).toBeNull();
  });
});
