import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DashboardDataset, TimePoint } from "../../src/types/dashboard";
import { reconcileObservations } from "./reconcile";
import { buildMetroComparison, comparisonSeriesIds } from "./metro-comparison";
import { diffMetric } from "./memo";
import { buildCoreMetricInterpretation, buildMetroComparisonInterpretation } from "../../src/lib/dashboard";

function fixture(): DashboardDataset {
  return JSON.parse(readFileSync(new URL("../../public/data/florida-economy.json", import.meta.url), "utf8")) as DashboardDataset;
}

describe("reviewed data consistency", () => {
  it("synchronizes terminal labor cards with the latest observations", () => {
    const d = fixture();
    d.metrics.nonfarmPayrolls.series = [{ date: "2026-06-01", value: 10032.8 }, { date: "2026-07-01", value: 10037.3 }];
    d.metrics.nonfarmPayrolls.latest = d.metrics.nonfarmPayrolls.series[1];
    d.metrics.unemploymentRate.latest = { date: "2026-07-01", value: 4.6 };
    reconcileObservations(d);
    const metrics = d.terminal.aiCapexIndex.metrics;
    expect(metrics.find((m) => m.id === "florida-payroll-jump")?.value).toBe("+4,500");
    expect(metrics.find((m) => m.id === "florida-unemployment-watch")?.value).toBe("4.6%");
    expect(metrics.find((m) => m.id === "florida-payroll-jump")?.context).toContain("July 2026");
    reconcileObservations(d);
    expect(d.terminal.sources.filter((s) => s.id === "bls_latest_state_labor")).toHaveLength(1);
  });

  it("preserves a dated power benchmark and its retrieval date when its feed fails", () => {
    const previous = fixture();
    const d = fixture();
    const oldSignal = previous.federal.signals.find((s) => s.id === "eia-industrial-electricity-price")!;
    oldSignal.retrievedAt = "2026-09-10T00:00:00Z";
    d.benchmarks!.power = null;
    const signal = d.federal.signals.find((s) => s.id === oldSignal.id)!;
    signal.status = "needs_key";
    signal.period = "not connected";
    signal.retrievedAt = "2026-10-01T00:00:00Z";
    reconcileObservations(d, previous);
    expect(d.benchmarks!.power).toEqual(previous.benchmarks!.power);
    expect(signal.period).toBe(oldSignal.period);
    expect(signal.retrievedAt).toBe(oldSignal.retrievedAt);
    expect(signal.status).toBe("fallback");
  });

  it("does not make a retained Census observation look newly retrieved", () => {
    const previous = fixture();
    const d = fixture();
    const original = previous.federal.signals.find((s) => s.id === "census-florida-exports")!;
    original.period = "2025-12";
    original.retrievedAt = "2026-08-01T00:00:00Z";
    const signal = d.federal.signals.find((s) => s.id === original.id)!;
    signal.status = "fallback";
    signal.retrievedAt = "2026-10-01T00:00:00Z";
    reconcileObservations(d, previous);
    expect(signal.retrievedAt).toBe(original.retrievedAt);
    expect(signal.caveat).toContain("2026-08-01");
  });

  it("keeps an independently refreshed Census observation", () => {
    const previous = fixture();
    const d = fixture();
    const signal = d.federal.signals.find((s) => s.id === "census-florida-exports")!;
    signal.status = "live";
    signal.period = "2026-07";
    reconcileObservations(d, previous);
    expect(signal.period).toBe("2026-07");
    expect(signal.status).toBe("live");
  });

  it("uses revised prior-month payrolls when calculating new-period growth", () => {
    const prev = fixture().metrics.nonfarmPayrolls;
    const next = fixture().metrics.nonfarmPayrolls;
    prev.latest = { date: "2026-06-01", value: 10033.3 };
    next.latest = { date: "2026-07-01", value: 10037.3 };
    next.series = [{ date: "2026-06-01", value: 10032.8 }, next.latest];
    const change = diffMetric("labor", "nonfarmPayrolls", prev, next)!;
    expect(change.absolute).toBeCloseTo(4.5);
    expect(change.prevValue).toBe(10032.8);
    expect(change.headline).toContain("4.5K jobs");
  });

  it("lets the observed annual change determine payroll interpretation", () => {
    const metric = fixture().metrics.nonfarmPayrolls;
    metric.deltas.oneYear = { years: 1, baseDate: "2025-07-01", absolute: 41, percent: 0.4 };
    expect(buildCoreMetricInterpretation(metric)).toContain("41K jobs above");
    metric.deltas.oneYear.absolute = -41;
    expect(buildCoreMetricInterpretation(metric)).toContain("41K jobs below");
    metric.deltas.oneYear = null;
    expect(buildCoreMetricInterpretation(metric)).toContain("unavailable");
  });

  it("warns that metro and statewide rates use different seasonal adjustment", () => {
    const result = buildMetroComparisonInterpretation(fixture(), "miami");
    expect(result).toContain("Metro rates shown here are not seasonally adjusted");
    expect(result).toContain("statewide headline is seasonally adjusted");
  });
});

describe("common-period metropolitan comparisons", () => {
  it("retains a dated prior comparison if any required series is unavailable", () => {
    const previous = fixture().competition.metroComparison;
    expect(buildMetroComparison(previous, {})).toBe(previous);
  });

  it("compares all metros in the latest shared month, using annual changes", () => {
    const previous = fixture().competition.metroComparison;
    const series: Record<string, TimePoint[]> = Object.fromEntries(comparisonSeriesIds.map((id) => [id, [
      { date: "2025-07-01", value: 100 },
      { date: "2026-07-01", value: 110 },
      { date: "2026-08-01", value: 120 },
    ]]));
    series[comparisonSeriesIds[0]].pop();
    const result = buildMetroComparison(previous, series);
    expect(result.asOf).toContain("July 2026");
    expect(result.regions).toHaveLength(9);
    expect(result.regions[0].signals[1].value).toBe("+10.0%");
    expect(result.regions[0].signals[3].value).toBe("+10.0 pp");
    expect(result.summary).toContain("do not measure productivity or AI employment");
  });
});
