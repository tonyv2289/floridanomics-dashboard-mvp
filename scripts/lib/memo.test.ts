import { describe, expect, it } from "vitest";
import type { DashboardDataset, Metric } from "../../src/types/dashboard";
import { buildPayload, diffDatasets, diffMetric, formatLevel, formatMove, monthLabel } from "./memo";

function metric(overrides: Partial<Metric> & { latest: Metric["latest"] }): Metric {
  return {
    id: "test",
    label: "Test Metric",
    unit: "percent",
    trendDirection: "up_good",
    deltas: { oneYear: null, threeYear: null, fiveYear: null },
    sparkline: [],
    series: [],
    source: "BLS",
    ...overrides,
  } as Metric;
}

function dataset(overrides: {
  asOf?: string;
  payrolls?: Metric;
  unemployment?: Metric;
  sectors?: Array<{ id: string; label: string; latest: { date: string; value: number } }>;
  metros?: Array<{ id: string; name: string; unemployment: { date: string; value: number } }>;
}): DashboardDataset {
  return {
    generatedAt: "2026-06-10T00:00:00.000Z",
    asOfLaborMarket: overrides.asOf ?? "April 2026",
    metrics: {
      nonfarmPayrolls:
        overrides.payrolls ??
        metric({ label: "Nonfarm Payrolls", unit: "thousands_jobs", latest: { date: "2026-04-01", value: 10000 } }),
      unemploymentRate:
        overrides.unemployment ??
        metric({ label: "Unemployment Rate", trendDirection: "down_good", latest: { date: "2026-04-01", value: 4.8 } }),
    },
    innovation: { metrics: {} },
    industry: {
      sectors: (overrides.sectors ?? []).map((sector) => ({
        id: sector.id,
        label: sector.label,
        latest: sector.latest,
        deltas: { oneYear: null, threeYear: null, fiveYear: null },
        sparkline: [],
        source: "BLS",
      })),
    },
    metros: (overrides.metros ?? []).map((metro) => ({
      id: metro.id,
      name: metro.name,
      unemploymentRate: { latest: metro.unemployment, deltas: { oneYear: null, threeYear: null, fiveYear: null }, sparkline: [] },
      laborForce: { latest: metro.unemployment, deltas: { oneYear: null, threeYear: null, fiveYear: null }, sparkline: [] },
      employmentLevel: { latest: metro.unemployment, deltas: { oneYear: null, threeYear: null, fiveYear: null }, sparkline: [] },
    })),
  } as unknown as DashboardDataset;
}

describe("formatters", () => {
  it("formats levels by unit", () => {
    expect(formatLevel("percent", 4.8)).toBe("4.8%");
    expect(formatLevel("thousands_jobs", 10000)).toBe("10M");
  });

  it("formats moves by unit and direction", () => {
    expect(formatMove("percent", 0.1)).toBe("up 0.1 points");
    expect(formatMove("percent", -0.2)).toBe("down 0.2 points");
    expect(formatMove("thousands_jobs", 40.5)).toBe("a gain of 40.5K jobs");
  });

  it("renders month labels in UTC", () => {
    expect(monthLabel("2026-04-01")).toBe("April 2026");
  });
});

describe("diffMetric", () => {
  it("detects a new period and assigns tone by trend direction", () => {
    const prev = metric({ label: "Nonfarm Payrolls", unit: "thousands_jobs", latest: { date: "2026-03-01", value: 9959.5 } });
    const next = metric({ label: "Nonfarm Payrolls", unit: "thousands_jobs", latest: { date: "2026-04-01", value: 10000 } });
    const change = diffMetric("labor", "nonfarmPayrolls", prev, next);

    expect(change?.kind).toBe("new_period");
    expect(change?.tone).toBe("good");
    expect(change?.headline).toContain("April 2026");
    expect(change?.headline).toContain("gain of 40.5K jobs");
  });

  it("treats a rise in a down_good metric as warn", () => {
    const prev = metric({ trendDirection: "down_good", latest: { date: "2026-03-01", value: 4.7 } });
    const next = metric({ trendDirection: "down_good", latest: { date: "2026-04-01", value: 4.8 } });
    expect(diffMetric("labor", "unemploymentRate", prev, next)?.tone).toBe("warn");
  });

  it("detects revisions of the same period", () => {
    const prev = metric({ latest: { date: "2026-04-01", value: 4.8 } });
    const next = metric({ latest: { date: "2026-04-01", value: 4.6 } });
    const change = diffMetric("labor", "unemploymentRate", prev, next);
    expect(change?.kind).toBe("revision");
    expect(change?.headline).toContain("revised");
  });

  it("returns null when nothing moved", () => {
    const same = metric({ latest: { date: "2026-04-01", value: 4.8 } });
    expect(diffMetric("labor", "unemploymentRate", same, same)).toBeNull();
  });
});

describe("diffDatasets", () => {
  it("caps industry movers at the top two by magnitude", () => {
    const prev = dataset({
      sectors: [
        { id: "a", label: "Sector A", latest: { date: "2026-03-01", value: 100 } },
        { id: "b", label: "Sector B", latest: { date: "2026-03-01", value: 100 } },
        { id: "c", label: "Sector C", latest: { date: "2026-03-01", value: 100 } },
      ],
    });
    const next = dataset({
      sectors: [
        { id: "a", label: "Sector A", latest: { date: "2026-04-01", value: 101 } },
        { id: "b", label: "Sector B", latest: { date: "2026-04-01", value: 110 } },
        { id: "c", label: "Sector C", latest: { date: "2026-04-01", value: 95 } },
      ],
    });

    const sectorItems = diffDatasets(prev, next).filter((item) => item.scope === "industry");
    expect(sectorItems).toHaveLength(2);
    expect(sectorItems[0].id).toBe("sector-b");
    expect(sectorItems[1].id).toBe("sector-c");
  });

  it("describes metro unemployment in plain language", () => {
    const prev = dataset({ metros: [{ id: "mia", name: "Miami", unemployment: { date: "2026-03-01", value: 4.2 } }] });
    const next = dataset({ metros: [{ id: "mia", name: "Miami", unemployment: { date: "2026-04-01", value: 4.0 } }] });

    const metro = diffDatasets(prev, next).find((item) => item.scope === "metro");
    expect(metro?.tone).toBe("good");
    expect(metro?.headline).toContain("Miami unemployment eased to 4.0%");
  });

  it("produces an empty list when datasets match", () => {
    const a = dataset({});
    expect(diffDatasets(a, a)).toHaveLength(0);
  });
});

describe("buildPayload", () => {
  it("carries periods and caps items", () => {
    const prev = dataset({ asOf: "March 2026" });
    const next = dataset({
      payrolls: metric({ label: "Nonfarm Payrolls", unit: "thousands_jobs", latest: { date: "2026-04-01", value: 10000 } }),
    });
    prev.metrics.nonfarmPayrolls = metric({
      label: "Nonfarm Payrolls",
      unit: "thousands_jobs",
      latest: { date: "2026-03-01", value: 9959.5 },
    });

    const payload = buildPayload(prev, next);
    expect(payload.period).toBe("April 2026");
    expect(payload.prevPeriod).toBe("March 2026");
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items.length).toBeLessThanOrEqual(8);
  });
});
