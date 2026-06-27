/**
 * SCAFFOLD - Epic 4: wire the orphaned FloridaMsaMap as a momentum map.
 * Not wired into the live app. The component (src/components/FloridaMsaMap.tsx) already
 * renders a clickable Florida map; this is the missing momentum-coloring brain + the
 * holdup list.
 *
 * HOLDUPS (all small, this is the most achievable of the five):
 *  1. CSS: the component uses v1/v2 class names (.panel, .florida-map, .metro-pin, etc.)
 *     that do not exist in dashboard-v3.css. Needs a v3 stylesheet port.
 *  2. Coordinates: METRO_COORDS only has miami/tampa/orlando/jacksonville. Any other
 *     metro in dataset.metros will not pin. Needs lat/lon for the full metro set.
 *  3. Momentum: the map shows pins but does not color by momentum. The function below
 *     supplies that; data (labor-force sparkline per metro) already exists.
 *  4. UX decision: what does clicking a metro DO in v3? (filter the Brief? open a metro
 *     drawer?) The old copy says "focus the dashboard," which v3 has no concept of.
 *     This is the only real product decision; everything else is mechanical.
 */

export type MomentumTone = "hot" | "warm" | "flat" | "cooling";

type SparkPoint = { value: number };

/** Percent change across the available window of a labor-force sparkline. */
export function laborForceMomentumPct(sparkline: SparkPoint[]): number | null {
  if (!sparkline || sparkline.length < 2) {
    return null;
  }
  const first = sparkline[0].value;
  const last = sparkline[sparkline.length - 1].value;
  if (!first) {
    return null;
  }
  return ((last - first) / first) * 100;
}

/** Bucket momentum into a color tone for the map fill. Thresholds are tunable. */
export function momentumTone(pct: number | null): MomentumTone {
  if (pct == null) {
    return "flat";
  }
  if (pct >= 2.5) {
    return "hot";
  }
  if (pct >= 0.5) {
    return "warm";
  }
  if (pct <= -0.5) {
    return "cooling";
  }
  return "flat";
}

export const MOMENTUM_COLORS: Record<MomentumTone, string> = {
  hot: "#3ee8b0",
  warm: "#56c2ff",
  flat: "#94a3b8",
  cooling: "#ff70a8",
};

export const MOMENTUM_MAP_READINESS = {
  component: { ready: true, blocker: "exists; needs v3 CSS port" },
  momentumColoring: { ready: true, blocker: "logic supplied here; data exists" },
  metroCoordinates: { ready: false, blocker: "only 4 metros have lat/lon" },
  uxDecision: { ready: false, blocker: "what a metro click does in v3 (product call)" },
} as const;
