import { type CoreMetricId, formatDateLabel } from "../lib/dashboard";
import type { DashboardDataset } from "../types/dashboard";

const EXPORT_METRICS: CoreMetricId[] = ["unemploymentRate", "nonfarmPayrolls", "laborForce", "employmentLevel"];

/** Full figures for a memo: rates to one decimal, counts to the person or job, never rounded to "10M". */
function exportValue(unit: string, value: number): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "thousands_jobs") return Math.round(value * 1000).toLocaleString("en-US");
  return Math.round(value).toLocaleString("en-US");
}

/**
 * The BLS release that published these figures. When its date has been read in the release itself, cite that
 * release's archived page, which never changes; otherwise cite the current release.
 */
export function blsReleaseCitation(releaseDate: string | null): string {
  if (!releaseDate) {
    return "BLS State Employment and Unemployment, latest release: https://www.bls.gov/news.release/laus.nr0.htm";
  }
  const [year, month, day] = releaseDate.split("-");
  const released = formatDateLabel(releaseDate, { month: "long", day: "numeric", year: "numeric" });
  return `BLS State Employment and Unemployment, released ${released}: https://www.bls.gov/news.release/archives/laus_${month}${day}${year}.htm`;
}

export function buildEvidenceBlock(dataset: DashboardDataset, compiledAt: string): string {
  const lines = EXPORT_METRICS.map((id) => {
    const metric = dataset.metrics[id];
    return `- ${metric.label}: ${exportValue(metric.unit, metric.latest.value)}`;
  });

  const releaseDate = dataset.trust.releaseCalendar.find((release) => release.id === "florida-labor")?.latestReleaseDate ?? null;
  const wser = dataset.sources.find((source) => source.id === "wser_floridacommerce");

  return [
    `Florida labor market, ${dataset.asOfLaborMarket} (seasonally adjusted):`,
    ...lines,
    "",
    "Sources:",
    `- ${blsReleaseCitation(releaseDate)}`,
    ...(wser ? [`- ${wser.name}: ${wser.url}`] : []),
    "",
    `Compiled by Floridanomics: ${compiledAt}`,
  ].join("\n");
}
