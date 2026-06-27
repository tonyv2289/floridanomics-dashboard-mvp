/**
 * SCAFFOLD - Epic 3: Personalization picker + threshold alerts.
 * Not wired into the live app. Shows what is doable client-side vs what needs a backend.
 *
 * CLIENT-SIDE (doable now, no backend): region + industry preference persisted to
 * localStorage (extends the shipped useFreshnessMemory pattern), and a "what needs your
 * attention" strip evaluated on load against the current dataset.
 *
 * HOLDUP: the audit's spec is "evaluated server-side at refresh and included in the
 * digest." That requires (a) a per-user store (the app is a static GitHub Pages site
 * with no backend) and (b) the email send path from the signup epic. So watch-rules
 * that travel into the inbox need a backend + list (Make.com / a tiny serverless fn).
 * Client-only alerts work today; cross-device + digest-delivered alerts do not.
 */
import { useEffect, useState } from "react";

export type FloridaRegion = "statewide" | "miami" | "tampa" | "orlando" | "jacksonville";
export type IndustryLens =
  | "all"
  | "logistics"
  | "health"
  | "fintech"
  | "defense"
  | "space"
  | "manufacturing";

export type Preferences = {
  region: FloridaRegion;
  industry: IndustryLens;
};

const PREFS_KEY = "fn:preferences";
const DEFAULT_PREFS: Preferences = { region: "statewide", industry: "all" };

function readPrefs(): Preferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFS;
  }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Client-side preference store. Effect-only write, lazy-init read (compiler-safe). */
export function usePreferences(): [Preferences, (next: Partial<Preferences>) => void] {
  const [prefs, setPrefs] = useState<Preferences>(readPrefs);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // localStorage blocked: preferences are session-only.
    }
  }, [prefs]);

  const update = (next: Partial<Preferences>) => setPrefs((current) => ({ ...current, ...next }));
  return [prefs, update];
}

// ---- Watch items / threshold alerts (client-side evaluation) ----

export type WatchRule =
  | { kind: "negative_1y" } // any negative one-year move
  | { kind: "below"; threshold: number }
  | { kind: "above"; threshold: number };

export type WatchItem = {
  metricId: string;
  label: string;
  rule: WatchRule;
};

export type AlertHit = {
  item: WatchItem;
  message: string;
};

type MinimalMetric = { latest: { value: number }; deltas: { oneYear?: { absolute?: number } | null } };

/** Evaluate watch items against the current dataset, client-side. */
export function evaluateAlerts(items: WatchItem[], metricById: Record<string, MinimalMetric>): AlertHit[] {
  const hits: AlertHit[] = [];
  for (const item of items) {
    const metric = metricById[item.metricId];
    if (!metric) {
      continue;
    }
    const value = metric.latest.value;
    const oneYear = metric.deltas.oneYear?.absolute ?? 0;
    if (item.rule.kind === "negative_1y" && oneYear < 0) {
      hits.push({ item, message: `${item.label} is down ${Math.abs(oneYear)} over one year.` });
    } else if (item.rule.kind === "below" && value < item.rule.threshold) {
      hits.push({ item, message: `${item.label} is below ${item.rule.threshold}.` });
    } else if (item.rule.kind === "above" && value > item.rule.threshold) {
      hits.push({ item, message: `${item.label} is above ${item.rule.threshold}.` });
    }
  }
  return hits;
}

export const ALERTS_READINESS = {
  preferencesPicker: { ready: true, blocker: "none; client-side localStorage" },
  clientSideAlertStrip: { ready: true, blocker: "none; evaluate on load" },
  serverSideAndDigest: { ready: false, blocker: "needs a backend/list + the email send path (signup epic)" },
} as const;
