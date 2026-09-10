import type { DashboardDataset } from "../../src/types/dashboard";
import { prettyMonth } from "./series";

/** Keep repeated observations synchronized and preserve dated source fallbacks. */
export function reconcileObservations(data: DashboardDataset, previous?: DashboardDataset | null): void {
  if (!data.competition.sources.some((source) => source.id === "bls_metro_laus_current")) {
    data.competition.sources.push({ id: "bls_metro_laus_current", label: "BLS metropolitan employment and unemployment", url: "https://www.bls.gov/news.release/metro.nr0.htm", note: "LAUS metropolitan estimates, not seasonally adjusted. The comparison uses one common observation month and year-earlier changes." });
  }
  const payroll = data.metrics.nonfarmPayrolls;
  const points = payroll.series;
  const change = points.length > 1 ? Math.round((points.at(-1)!.value - points.at(-2)!.value) * 1000) : null;
  const texas = data.strategy.peerStates.find((state) => state.id === "TX");
  const sourceId = "bls_latest_state_labor";
  if (!data.terminal.sources.some((source) => source.id === sourceId)) {
    data.terminal.sources.push({ id: sourceId, label: "BLS state employment and unemployment", url: "https://www.bls.gov/news.release/laus.nr0.htm", tier: "official", note: "Use the observation period shown beside each metric. Preliminary estimates are revised." });
  }
  for (const metric of data.terminal.aiCapexIndex.metrics) {
    if (metric.id === "florida-payroll-jump") Object.assign(metric, {
      label: "Florida monthly payroll change", value: change === null ? "Unavailable" : `${change >= 0 ? "+" : ""}${change.toLocaleString("en-US")}`,
      context: `${prettyMonth(payroll.latest.date)}; seasonally adjusted, subject to revision`, sourceIds: [sourceId],
    });
    if (metric.id === "florida-unemployment-watch") Object.assign(metric, {
      label: "Florida unemployment", value: `${data.metrics.unemploymentRate.latest.value.toFixed(1)}%`,
      context: `${prettyMonth(data.metrics.unemploymentRate.latest.date)}; seasonally adjusted`, sourceIds: [sourceId],
    });
    if (metric.id === "texas-peer-spread" && texas) Object.assign(metric, {
      value: `${texas.unemploymentRate.latest.value.toFixed(1)}%`, context: `${prettyMonth(texas.unemploymentRate.latest.date)}; seasonally adjusted`, sourceIds: [sourceId],
    });
  }
  if (data.benchmarks && !data.benchmarks.power && previous?.benchmarks?.power) {
    data.benchmarks.power = structuredClone(previous.benchmarks.power);
  }
  const power = data.benchmarks?.power;
  const floridaPower = power?.rows.find((row) => row.stateId === "FL");
  const powerSignal = data.federal.signals.find((signal) => signal.id === "eia-industrial-electricity-price");
  if (power && floridaPower && powerSignal && powerSignal.status !== "live") {
    Object.assign(powerSignal, { value: floridaPower.industrialCentsPerKwh.toFixed(2), period: floridaPower.period,
      status: "fallback", sourceUrl: power.source.url, read: "Statewide industrial average from the dated EIA benchmark.",
      caveat: "Retained public-source benchmark; the period shown is not the date of this build. It is not a project-specific tariff." });
    const priorSignal = previous?.federal.signals.find((signal) => signal.id === powerSignal.id);
    if (priorSignal?.period === powerSignal.period) powerSignal.retrievedAt = priorSignal.retrievedAt;
  }
  const exports = data.federal.signals.find((signal) => signal.id === "census-florida-exports");
  const priorExports = previous?.federal.signals.find((signal) => signal.id === exports?.id);
  if (exports && exports.status !== "live" && priorExports?.period.match(/^\d{4}-\d{2}$/)) {
    Object.assign(exports, structuredClone(priorExports), { status: "fallback",
      caveat: `Cached Census observation, last retrieved ${priorExports.retrievedAt?.slice(0, 10) ?? "date unavailable"}. The Trade section retains its separately identified annual-release vintage.` });
  }
}
