import type { LeadingSignal, LeadingSignalChange } from "../types/dashboard";

export function formatSignalValue(signal: LeadingSignal): string {
  if (signal.unit === "index") {
    return signal.latest.value.toFixed(1);
  }
  return Math.round(signal.latest.value).toLocaleString();
}

export function formatChange(change: LeadingSignalChange): string {
  if (change.percent === null) {
    return `${change.absolute >= 0 ? "+" : "-"}${Math.abs(Math.round(change.absolute)).toLocaleString()} ${change.label}`;
  }
  const sign = change.percent >= 0 ? "+" : "-";
  return `${sign}${Math.abs(change.percent).toFixed(1)}% ${change.label}`;
}

export function changeTone(signal: LeadingSignal, change: LeadingSignalChange): "good" | "warn" | "flat" {
  if (Math.abs(change.percent ?? change.absolute) < 1e-9) {
    return "flat";
  }
  const improved = (change.absolute > 0) === (signal.trendDirection === "up_good");
  return improved ? "good" : "warn";
}
