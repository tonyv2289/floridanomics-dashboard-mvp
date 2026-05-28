import { describe, expect, it } from "vitest";
import type { Delta, Metric, MetricUnit } from "../types/dashboard";
import {
  daysSince,
  deltaTone,
  displayValue,
  formatCompact,
  formatDelta,
  formatMetricValue,
  formatSignedPercent,
  formatSignedUsdBillions,
  formatTradeHero,
  formatUsdBillions,
  formatUsdMillions,
  shortMonthLabel,
} from "./dashboard";

function metric(unit: MetricUnit, trend: Metric["trendDirection"] = "up_good"): Metric {
  return {
    id: "test",
    label: "Test",
    unit,
    trendDirection: trend,
    latest: { date: "2026-01-01", value: 0 },
    deltas: { oneYear: null, threeYear: null, fiveYear: null },
    sparkline: [],
    series: [],
    source: "BLS",
  };
}

function delta(absolute: number, percent: number | null = null): Delta {
  return { years: 1, baseDate: "2025-01-01", absolute, percent };
}

describe("displayValue", () => {
  it("scales thousands_jobs to absolute jobs", () => {
    expect(displayValue(metric("thousands_jobs"), 9700)).toBe(9_700_000);
  });

  it("scales usd_millions to absolute dollars", () => {
    expect(displayValue(metric("usd_millions"), 1234)).toBe(1_234_000_000);
  });

  it("passes percent and persons through unchanged", () => {
    expect(displayValue(metric("percent"), 4.5)).toBe(4.5);
    expect(displayValue(metric("persons"), 23_000_000)).toBe(23_000_000);
  });
});

describe("formatCompact", () => {
  it("renders compact magnitudes", () => {
    expect(formatCompact(1_234_567)).toBe("1.2M");
    expect(formatCompact(950)).toBe("950");
  });
});

describe("formatMetricValue", () => {
  it("formats percent with one decimal and a sign-free suffix", () => {
    expect(formatMetricValue(metric("percent"), 4.53)).toBe("4.5%");
  });

  it("formats usd_millions as a compact dollar figure", () => {
    expect(formatMetricValue(metric("usd_millions"), 1500)).toBe("$1.5B");
  });

  it("formats thousands_jobs compactly in absolute jobs", () => {
    expect(formatMetricValue(metric("thousands_jobs"), 9700)).toBe("9.7M");
  });
});

describe("formatDelta", () => {
  it("returns n/a for a missing delta", () => {
    expect(formatDelta(metric("percent"), null)).toBe("n/a");
  });

  it("renders percent deltas in percentage points", () => {
    expect(formatDelta(metric("percent"), delta(0.6))).toBe("+0.6 pp");
    expect(formatDelta(metric("percent"), delta(-0.6))).toBe("-0.6 pp");
  });

  it("renders count deltas with absolute and percent change", () => {
    expect(formatDelta(metric("count"), delta(12_345, 3.2))).toBe("+12.3K (+3.2%)");
  });
});

describe("deltaTone", () => {
  it("treats a rise as good when up is good", () => {
    expect(deltaTone(metric("count", "up_good"), delta(100))).toBe("good");
    expect(deltaTone(metric("count", "up_good"), delta(-100))).toBe("warn");
  });

  it("treats a fall as good when down is good (e.g. unemployment)", () => {
    expect(deltaTone(metric("percent", "down_good"), delta(-0.3))).toBe("good");
    expect(deltaTone(metric("percent", "down_good"), delta(0.3))).toBe("warn");
  });

  it("is neutral for a negligible or missing delta", () => {
    expect(deltaTone(metric("count"), null)).toBe("neutral");
    expect(deltaTone(metric("count"), delta(0))).toBe("neutral");
  });
});

describe("usd formatters", () => {
  it("formatUsdBillions crosses M / B / T thresholds", () => {
    expect(formatUsdBillions(0.5)).toBe("$500M");
    expect(formatUsdBillions(5)).toBe("$5.0B");
    expect(formatUsdBillions(1500)).toBe("$1.50T");
  });

  it("formatUsdMillions crosses M / B thresholds", () => {
    expect(formatUsdMillions(500)).toBe("$500M");
    expect(formatUsdMillions(1500)).toBe("$1.50B");
  });
});

describe("formatTradeHero", () => {
  it("dispatches on unit", () => {
    expect(formatTradeHero(73.4, "usd_billions")).toBe("$73.4B");
    expect(formatTradeHero(12.34, "percent")).toBe("12.3%");
    expect(formatTradeHero(48000, "count")).toBe("48,000");
  });
});

describe("signed formatters", () => {
  it("formatSignedPercent handles null and sign", () => {
    expect(formatSignedPercent(null)).toBe("n/a");
    expect(formatSignedPercent(5)).toBe("+5.0%");
    expect(formatSignedPercent(-3.2)).toBe("-3.2%");
  });

  it("formatSignedUsdBillions handles null and sign", () => {
    expect(formatSignedUsdBillions(null)).toBe("n/a");
    expect(formatSignedUsdBillions(2)).toBe("+$2.0B");
    expect(formatSignedUsdBillions(-1.5)).toBe("-$1.5B");
  });
});

describe("date helpers", () => {
  it("shortMonthLabel renders a UTC-stable month/year", () => {
    expect(shortMonthLabel("2026-01-15")).toBe("Jan 26");
  });

  it("daysSince is non-negative and 0 for the future", () => {
    expect(daysSince("2020-01-01")).toBeGreaterThan(0);
    expect(daysSince("2999-01-01")).toBe(0);
  });
});
