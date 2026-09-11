import regionalEconomy from "../../public/data/regional-economy.json";
import calendarData from "../../public/data/release-calendar.json";
import type { ReleaseCalendar } from "../lib/release-calendar";
import type { DashboardDataset } from "../types/dashboard";
import { assessFreshness } from "../lib/freshness";

export function FreshnessNotice({ dataset, expanded = false }: { dataset: DashboardDataset; expanded?: boolean }) {
  const findings = assessFreshness(dataset, regionalEconomy, calendarData as ReleaseCalendar);
  const overdue = findings.filter((finding) => finding.level === "overdue");
  if (!findings.length) return null;
  return <aside className="freshness-notice" aria-label="Data freshness notes">
    <p>{overdue.length ? `${overdue.length} data series need a freshness check.` : "Some sections use dated annual benchmarks."} {!expanded ? <a href={`${import.meta.env.BASE_URL}?view=dashboard&tab=evidence#freshness`}>See source dates and limitations →</a> : null}</p>
    {expanded ? <ul>{findings.map((finding) => <li key={finding.id}><strong>{finding.label}:</strong> {finding.detail}</li>)}</ul> : null}
  </aside>;
}
