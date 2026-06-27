import { useEffect, useState } from "react";
import type { DashboardDataset } from "../types/dashboard";

type DashboardStatus = "idle" | "loading" | "ready" | "error";

type DashboardDataState = {
  data: DashboardDataset | null;
  error: string | null;
  status: DashboardStatus;
};

// Top-level keys the UI depends on. A boundary check here turns a schema drift into a
// clean error state instead of a downstream white screen.
const REQUIRED_KEYS: Array<keyof DashboardDataset> = [
  "metrics",
  "heroMetrics",
  "industry",
  "metros",
  "innovation",
  "scorecard2030",
  "competition",
  "terminal",
  "trade",
];

function assertDataset(payload: unknown): asserts payload is DashboardDataset {
  if (!payload || typeof payload !== "object") {
    throw new Error("Dataset payload is not an object.");
  }
  const record = payload as Record<string, unknown>;
  const missing = REQUIRED_KEYS.filter((key) => record[key] == null);
  if (missing.length > 0) {
    throw new Error(`Dataset is missing required sections: ${missing.join(", ")}.`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useDashboardData(enabled = true): DashboardDataState {
  const [data, setData] = useState<DashboardDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DashboardStatus>(enabled ? "loading" : "idle");

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      setError(null);

      const url = `${import.meta.env.BASE_URL}data/florida-economy.json`;
      const maxAttempts = 2;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          // cache: "default" lets etag/last-modified revalidation reuse bytes across
          // remounts and back-navigation, so warm loads stop behaving like cold loads.
          const response = await fetch(url, { cache: "default", signal: controller.signal });
          if (!response.ok) {
            throw new Error(`Unable to load dataset (${response.status})`);
          }
          const payload = (await response.json()) as unknown;
          assertDataset(payload);

          if (!cancelled) {
            setData(payload);
            setStatus("ready");
          }
          return;
        } catch (loadError) {
          if (controller.signal.aborted || cancelled) {
            return;
          }
          lastError = loadError;
          if (attempt < maxAttempts) {
            await sleep(400 * attempt);
          }
        }
      }

      if (!cancelled) {
        setError(lastError instanceof Error ? lastError.message : "Unknown error");
        setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled]);

  return { data, error, status };
}
