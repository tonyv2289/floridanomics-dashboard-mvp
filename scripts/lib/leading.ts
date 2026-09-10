import type { LeadingSection, LeadingSignal, LeadingSignalChange, TimePoint } from "../../src/types/dashboard";
import { getBasePoint } from "./series";
import { fetchFredSeries, fetchIndeedStatePostings } from "./sources";

const SERIES_KEEP = 90;

export function changeVsTrailingAverage(
  series: TimePoint[],
  windowSize: number,
  label: string,
): LeadingSignalChange | null {
  if (series.length < windowSize + 1) {
    return null;
  }

  const latest = series[series.length - 1];
  const window = series.slice(-(windowSize + 1), -1);
  const average = window.reduce((sum, point) => sum + point.value, 0) / window.length;
  const absolute = latest.value - average;

  return {
    label,
    absolute,
    percent: average === 0 ? null : (absolute / average) * 100,
  };
}

export function changeVsYearAgo(series: TimePoint[]): LeadingSignalChange | null {
  const latest = series.at(-1);
  const base = getBasePoint(series, 1);
  if (!latest || !base || base.date === latest.date) {
    return null;
  }

  const absolute = latest.value - base.value;
  return {
    label: "vs a year earlier",
    absolute,
    percent: base.value === 0 ? null : (absolute / base.value) * 100,
  };
}

export function buildSignal(meta: {
  id: string;
  label: string;
  cadence: LeadingSignal["cadence"];
  unit: LeadingSignal["unit"];
  trendDirection: LeadingSignal["trendDirection"];
  leads: string;
  source: LeadingSignal["source"];
  recentWindow: number;
  recentLabel: string;
  series: TimePoint[];
}): LeadingSignal | null {
  const latest = meta.series.at(-1);
  if (!latest) {
    return null;
  }

  return {
    id: meta.id,
    label: meta.label,
    cadence: meta.cadence,
    unit: meta.unit,
    trendDirection: meta.trendDirection,
    latest,
    changes: {
      recent: changeVsTrailingAverage(meta.series, meta.recentWindow, meta.recentLabel),
      yearOver: changeVsYearAgo(meta.series),
    },
    leads: meta.leads,
    source: meta.source,
    series: meta.series.slice(-SERIES_KEEP),
  };
}

export async function buildLeadingSection(): Promise<LeadingSection> {
  const [postings, initialClaims, continuedClaims, permits] = await Promise.all([
    fetchIndeedStatePostings("fl"),
    fetchFredSeries("FLICLAIMS"),
    fetchFredSeries("FLCCLAIMS"),
    fetchFredSeries("FLBPPRIV"),
  ]);

  const signals = [
    buildSignal({
      id: "jobPostings",
      label: "Job postings index",
      cadence: "daily",
      unit: "index",
      trendDirection: "up_good",
      leads: "Advertised hiring demand; vacancies do not necessarily become filled jobs.",
      source: { label: "Indeed Hiring Lab", url: "https://github.com/hiring-lab/job_postings_tracker" },
      recentWindow: 30,
      recentLabel: "vs 30-day average",
      series: postings,
    }),
    buildSignal({
      id: "initialClaims",
      label: "Initial unemployment claims",
      cadence: "weekly",
      unit: "claims",
      trendDirection: "down_good",
      leads: "New claims for unemployment insurance; affected by eligibility, seasonality, and reporting.",
      source: { label: "US DOL via FRED (FLICLAIMS)", url: "https://fred.stlouisfed.org/series/FLICLAIMS" },
      recentWindow: 4,
      recentLabel: "vs 4-week average",
      series: initialClaims,
    }),
    buildSignal({
      id: "continuedClaims",
      label: "Continued unemployment claims",
      cadence: "weekly",
      unit: "claims",
      trendDirection: "down_good",
      leads: "Ongoing benefit claims; changes can reflect hiring, benefit exhaustion, and other factors.",
      source: { label: "US DOL via FRED (FLCCLAIMS)", url: "https://fred.stlouisfed.org/series/FLCCLAIMS" },
      recentWindow: 4,
      recentLabel: "vs 4-week average",
      series: continuedClaims,
    }),
    buildSignal({
      id: "buildingPermits",
      label: "Building permits (units)",
      cadence: "monthly",
      unit: "units",
      trendDirection: "up_good",
      leads: "Authorized housing units, not completed construction.",
      source: { label: "US Census via FRED (FLBPPRIV)", url: "https://fred.stlouisfed.org/series/FLBPPRIV" },
      recentWindow: 3,
      recentLabel: "vs 3-month average",
      series: permits,
    }),
  ].filter((signal): signal is LeadingSignal => Boolean(signal));

  return {
    headline: "Early economic indicators.",
    summary:
      "Job postings, unemployment claims, and building permits provide additional context between monthly labor releases. Their timing and coverage differ; none guarantees a future outcome.",
    signals,
  };
}
