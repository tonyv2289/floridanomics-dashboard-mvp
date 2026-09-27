import type {
  StateFacilityHistoryRow,
  StateInvestmentFormat,
  StateInvestmentMeasure,
  StateReportedCell,
  StateReportedQualifier,
  StateReportedRow,
} from "../types/dashboard";

export function formatStateValue(value: number, format: StateInvestmentFormat): string {
  if (format === "usd0") return `$${Math.round(value).toLocaleString("en-US")}`;
  if (format === "pct1") return `${value.toFixed(1)}%`;
  if (format === "signedPct1") return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  return value.toFixed(1);
}

export function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${{ 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th"}`;
}

export type StateBar = { state: string; value: number; label: string; offsetPercent: number; widthPercent: number; isFlorida: boolean };

// Bars share one zero-based scale so negative values (job losses) extend left of the zero line.
export function stateBars(measure: StateInvestmentMeasure): { bars: StateBar[]; zeroPercent: number } {
  const values = measure.states.map((row) => row.value);
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const span = high - low || 1;
  const toPercent = (value: number) => ((value - low) / span) * 100;
  const zeroPercent = toPercent(0);
  const bars = [...measure.states]
    .sort((a, b) => b.value - a.value)
    .map((row) => ({
      state: row.state,
      value: row.value,
      label: formatStateValue(row.value, measure.format),
      offsetPercent: Math.min(toPercent(row.value), zeroPercent),
      widthPercent: Math.abs(toPercent(row.value) - zeroPercent),
      isFlorida: row.state === "Florida",
    }));
  return { bars, zeroPercent };
}

export type FacilityMetric = "perMillion" | "projects";
export type SortDirection = "desc" | "asc";

export function formatFacilityValue(value: number, metric: FacilityMetric): string {
  return metric === "perMillion" ? value.toFixed(1) : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

// Sorts by the chosen year's rank, so ties (which share a rank) stay together and list alphabetically.
// "desc" puts the highest value first.
export function sortFacilityRows(rows: StateFacilityHistoryRow[], metric: FacilityMetric, yearIndex: number, direction: SortDirection): StateFacilityHistoryRow[] {
  const ranks = (row: StateFacilityHistoryRow) => (metric === "perMillion" ? row.rankPerMillion : row.rankProjects)[yearIndex];
  return [...rows].sort((a, b) => (direction === "desc" ? ranks(a) - ranks(b) : ranks(b) - ranks(a)) || a.state.localeCompare(b.state));
}

// State-reported totals: shown as each state published them, never ranked.
export type ReportedMetric = "capital" | "jobs" | "count";
export type ReportedBasis = "calendar" | "fiscal";

const QUALIFIER_MARK: Record<StateReportedQualifier, string> = { more_than: ">", at_least: "≥", about: "~", up_to: "≤" };
const QUALIFIER_WORDS: Record<StateReportedQualifier, string> = { more_than: "more than ", at_least: "at least ", about: "about ", up_to: "up to " };
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumSignificantDigits: 3 });

export function reportedValue(cell: StateReportedCell | null, metric: ReportedMetric): number | undefined {
  if (!cell) return undefined;
  return metric === "capital" ? cell.capital : metric === "jobs" ? cell.jobs : cell.count;
}

function reportedQualifier(cell: StateReportedCell, metric: ReportedMetric): StateReportedQualifier | undefined {
  return metric === "capital" ? cell.capitalQualifier : metric === "jobs" ? cell.jobsQualifier : undefined;
}

function reportedNumber(value: number, metric: ReportedMetric): string {
  return metric === "capital" ? usdCompact.format(value) : value.toLocaleString("en-US");
}

// The figure with its qualifier mark (">$3.5B"), or null when the state published no figure for this measure.
export function formatReportedValue(cell: StateReportedCell | null, metric: ReportedMetric): string | null {
  const value = reportedValue(cell, metric);
  if (value === undefined || !cell) return null;
  const qualifier = reportedQualifier(cell, metric);
  return `${qualifier ? QUALIFIER_MARK[qualifier] : ""}${reportedNumber(value, metric)}`;
}

// What the figure measures, shown under it: a dollar figure's basis when it is not capital investment, the jobs definition,
// or the count's unit when it is not projects.
export function reportedNote(cell: StateReportedCell, metric: ReportedMetric): string {
  if (metric === "capital") return cell.capitalNote ?? "";
  if (metric === "jobs") return cell.jobsNote ?? "";
  return cell.countUnit && cell.countUnit !== "projects" ? cell.countUnit : "";
}

// Footnote marks: dagger for one program or agency only, double dagger for a Site Selection count the state cites.
export function reportedMarks(cell: StateReportedCell): string {
  return `${cell.programOnly ? "†" : ""}${cell.viaSiteSelection ? "‡" : ""}`;
}

// A spoken description for the figure's link: value in words, period, what it measures, scope and source.
export function describeReported(state: string, basis: ReportedBasis, year: number, cell: StateReportedCell, metric: ReportedMetric, sourceLabel: string): string {
  const value = reportedValue(cell, metric);
  if (value === undefined) return `${state}, ${basis} ${year}: not published`;
  const qualifier = reportedQualifier(cell, metric);
  const what = metric === "capital" ? cell.capitalNote ?? "capital investment" : metric === "jobs" ? `jobs (${cell.jobsNote ?? "type not stated"})` : cell.countUnit ?? "projects";
  const period = basis === "fiscal" && cell.period ? ` (${cell.period})` : "";
  const scope = [cell.programOnly ? "one program or agency only" : "", cell.viaSiteSelection ? "Site Selection count cited by the state" : ""].filter(Boolean).join("; ");
  return `${state}, ${basis} ${year}${period}: ${qualifier ? QUALIFIER_WORDS[qualifier] : ""}${reportedNumber(value, metric)} ${what}${scope ? `; ${scope}` : ""}. Source: ${sourceLabel}`;
}

// Sorts by the chosen year's figure; states that published none list last in either direction, then alphabetically.
export function sortReportedRows(rows: StateReportedRow[], metric: ReportedMetric, basis: ReportedBasis, yearIndex: number, direction: SortDirection): StateReportedRow[] {
  const value = (row: StateReportedRow) => reportedValue(row[basis][yearIndex], metric);
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (x === undefined || y === undefined) return x === y ? a.state.localeCompare(b.state) : x === undefined ? 1 : -1;
    return (direction === "desc" ? y - x : x - y) || a.state.localeCompare(b.state);
  });
}
