import type { DashboardDataset, TimePoint } from "../../src/types/dashboard";
import { prettyMonth } from "./series";

export const COMPARISON_METROS = [
  { id: "south-florida", root: "LAUMT123310000000" },
  { id: "tampa", root: "LAUMT124530000000" },
  { id: "orlando", root: "LAUMT123674000000" },
  { id: "jacksonville", root: "LAUMT122726000000" },
  { id: "austin", root: "LAUMT481242000000" },
  { id: "seattle", root: "LAUMT534266000000" },
  { id: "boston", root: "LAUMT251446000000" },
  { id: "chicago", root: "LAUMT171698000000" },
  { id: "nashville", root: "LAUMT473498000000" },
];
export const comparisonSeriesIds = COMPARISON_METROS.flatMap(({ root }) => [root + "003", root + "006"]);

export function buildMetroComparison(
  previous: DashboardDataset["competition"]["metroComparison"],
  series: Record<string, TimePoint[]>,
): DashboardDataset["competition"]["metroComparison"] {
  const all = comparisonSeriesIds.map((id) => series[id]);
  if (all.some((points) => !points?.length)) return previous;
  const commonDate = all[0].map((p) => p.date).reverse().find((date) => all.every((points) => points.some((p) => p.date === date)));
  if (!commonDate) return previous;
  const yearEarlier = `${Number(commonDate.slice(0, 4)) - 1}${commonDate.slice(4)}`;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
  return {
    headline: "Nine metro labor markets, measured the same way.",
    summary: "Nine metro areas, using the same BLS household survey measures for the same month. Comparing each month with the same month a year earlier takes out most seasonal swings. These figures cover residents' jobs and unemployment.",
    asOf: `BLS LAUS ${prettyMonth(commonDate)}; not seasonally adjusted; preliminary estimates may be revised`,
    regions: COMPARISON_METROS.map(({ id, root }) => {
      const old = previous.regions.find((region) => region.id === id);
      if (!old) throw new Error(`Missing comparison region ${id}`);
      const rate = series[root + "003"].find((p) => p.date === commonDate)!;
      const labor = series[root + "006"].find((p) => p.date === commonDate)!;
      const priorRate = series[root + "003"].find((p) => p.date === yearEarlier);
      const priorLabor = series[root + "006"].find((p) => p.date === yearEarlier);
      const rateChange = priorRate ? rate.value - priorRate.value : null;
      const laborChange = priorLabor?.value ? (labor.value / priorLabor.value - 1) * 100 : null;
      return {
        ...old,
        role: "Metropolitan labor market",
        momentum: "mixed" as const,
        verdict: `${rate.value.toFixed(1)}% unemployment in ${prettyMonth(commonDate)}.`,
        read: "Residents who are working or looking for work.",
        sourceIds: ["bls_metro_laus_current"],
        signals: [
          { label: "Labor force", direction: "neutral" as const, value: labor.value.toLocaleString("en-US"), detail: `Residents; ${prettyMonth(commonDate)}, not seasonally adjusted.` },
          { label: "Annual labor-force change", direction: "neutral" as const, value: laborChange === null ? "Unavailable" : `${signed(laborChange)}%`, detail: "Same-month year-earlier comparison; not a migration estimate." },
          { label: "Unemployment rate", direction: "neutral" as const, value: `${rate.value.toFixed(1)}%`, detail: "Share of the civilian labor force unemployed and actively seeking work." },
          { label: "Annual rate change", direction: "neutral" as const, value: rateChange === null ? "Unavailable" : `${signed(rateChange)} pp`, detail: "Percentage-point change from the same month a year earlier." },
        ],
      };
    }),
  };
}
