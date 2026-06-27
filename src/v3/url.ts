import type { CompetitionViewId, V3TabId } from "./constants";

export function readSearchParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

export function isV3TabId(value: string | null): value is V3TabId {
  return (
    value === "brief" ||
    value === "lens" ||
    value === "competition" ||
    value === "strategy" ||
    value === "terminal" ||
    value === "scorecard" ||
    value === "innovation" ||
    value === "trade"
  );
}

export function isCompetitionViewId(value: string | null): value is CompetitionViewId {
  return value === "metro" || value === "international" || value === "fdi";
}
