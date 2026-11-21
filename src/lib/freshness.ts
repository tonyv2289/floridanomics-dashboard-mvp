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
    if (due && observations[program] < due.observationDate) findings.push({ id: program, label: labels[program], level: "overdue", detail: `The ${due.observationDate.slice(0, 7)} observation was scheduled for release on ${due.releaseDate}. This site still shows ${observations[program].slice(0, 7)} and is waiting on review.` });
    if (!findings.some((finding) => finding.id === program) && age(observations[program], now) > (program === "county-wages" ? 365 : 130)) findings.push({ id: program, label: labels[program], level: "overdue", detail: "This figure is older than its expected update window and needs to be checked against its source." });
  }
  if (age(calendar.checkedAt, now) > 45) findings.push({ id: "calendar", label: "Release calendar", level: "review", detail: `The official calendar was last checked ${calendar.checkedAt}. Release dates may have moved since then.` });
  for (const signal of dataset.leading?.signals ?? []) {
    const maxAge = signal.id === "buildingPermits" ? 100 : signal.id === "continuedClaims" ? 28 : 21;
    if (age(signal.latest.date, now) > maxAge) findings.push({ id: signal.id, label: signal.label, level: "overdue", detail: `The latest observation is ${signal.latest.date}. Nothing newer has been published here in ${maxAge} days.` });
  }
  const exports = dataset.federal.signals.find((signal) => signal.id === "census-florida-exports");
  const annualTrade = exports && /^\d{4}-12$/.test(exports.period) && Number(exports.period.slice(0, 4)) < now.getUTCFullYear();
  if (annualTrade) findings.push({ id: "trade-benchmark", label: "Trade", level: "review", detail: `Annual ${exports.period.slice(0, 4)} figures are kept. They are annual benchmarks, not this month's trade.${exports.status !== "live" ? " The direct check against Census has not succeeded since the last retrieval." : " The Census check confirms the annual total. It does not make it a monthly figure."}` });
  else if (exports && exports.status !== "live") findings.push({ id: "trade-benchmark", label: "Trade", level: "review", detail: `The ${exports.period} Census trade figure has not been checked against Census again. The date it was retrieved is not the period it describes.` });
  const power = dataset.benchmarks?.power?.rows.find((row) => row.stateId === "FL");
  if (power && age(`${power.period.slice(0, 7)}-01`, now) > 130) findings.push({ id: "power", label: "Industrial electricity price", level: "overdue", detail: `The price benchmark is ${power.period}; check the latest EIA monthly table.` });
  return findings;
}
