import type { StateInvestmentFormat, StateInvestmentMeasure } from "../types/dashboard";

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
