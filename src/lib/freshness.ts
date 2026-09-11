import type { DashboardDataset } from "../types/dashboard";
import type { RegionalEconomy } from "../regions/geographies";
import type { ReleaseCalendar, ReleaseProgram } from "./release-calendar";

export type FreshnessFinding = { id: string; label: string; detail: string; level: "overdue" | "review" };
const day = 86400000;
const age = (date: string, now: Date) => Math.floor((now.getTime() - new Date(date).getTime()) / day);

export function assessFreshness(dataset: DashboardDataset, economy: RegionalEconomy, calendar: ReleaseCalendar, now = new Date()): FreshnessFinding[] {
  const findings: FreshnessFinding[] = [];
  const observations: Record<ReleaseProgram, string> = {
    "state-labor": [dataset.metrics.nonfarmPayrolls.latest.date, dataset.metrics.unemploymentRate.latest.date, dataset.metrics.employmentLevel.latest.date, dataset.metrics.laborForce.latest.date].sort()[0],
    "metro-labor": dataset.metros.flatMap((metro) => [metro.unemploymentRate.latest.date, metro.laborForce.latest.date]).sort()[0],
    "county-wages": economy.employmentMonth,
  };
  const labels = { "state-labor": "State labor data", "metro-labor": "Metro labor data", "county-wages": "County jobs and wages" };
  for (const program of Object.keys(observations) as ReleaseProgram[]) {
    // Allow two calendar days for release delays, source revisions and publication review.
    const due = calendar.releases.filter((release) => release.program === program && age(release.releaseDate, now) >= 2).at(-1);
    if (due && observations[program] < due.observationDate) findings.push({ id: program, label: labels[program], level: "overdue", detail: `The ${due.observationDate.slice(0, 7)} observation was scheduled for release on ${due.releaseDate}. Published data still show ${observations[program].slice(0, 7)}; verify the source and review before updating.` });
    if (!findings.some((finding) => finding.id === program) && age(observations[program], now) > (program === "county-wages" ? 365 : 130)) findings.push({ id: program, label: labels[program], level: "overdue", detail: "The observation is outside its fallback freshness window and needs a source check, even if the retained calendar has no newer release." });
  }
  if (age(calendar.checkedAt, now) > 45) findings.push({ id: "calendar", label: "Release calendar", level: "review", detail: `The official calendar was last checked ${calendar.checkedAt}. Confirm dates have not moved.` });
  for (const signal of dataset.leading?.signals ?? []) {
    const maxAge = signal.id === "buildingPermits" ? 100 : signal.id === "continuedClaims" ? 28 : 21;
    if (age(signal.latest.date, now) > maxAge) findings.push({ id: signal.id, label: signal.label, level: "overdue", detail: `The latest observation is ${signal.latest.date}. Check its source; no new observation has been published here within the ${maxAge}-day review window.` });
  }
  const exports = dataset.federal.signals.find((signal) => signal.id === "census-florida-exports");
  if (exports && exports.status !== "live") findings.push({ id: "trade-benchmark", label: "Trade", level: "review", detail: "Annual 2025 figures are retained. The direct monthly Census feed is not verified; do not describe this as current-month trade." });
  const power = dataset.benchmarks?.power?.rows.find((row) => row.stateId === "FL");
  if (power && age(`${power.period.slice(0, 7)}-01`, now) > 130) findings.push({ id: "power", label: "Industrial electricity price", level: "overdue", detail: `The price benchmark is ${power.period}; check the latest EIA monthly table.` });
  return findings;
}
