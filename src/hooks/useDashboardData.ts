import { useEffect, useState } from "react";
import type { DashboardDataset } from "../types/dashboard";

type DashboardStatus = "idle" | "loading" | "ready" | "error";

type DashboardDataState = {
  data: DashboardDataset | null;
  error: string | null;
  status: DashboardStatus;
};

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

    async function load() {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/florida-economy.json`, {
          cache: "no-cache",
        });

        if (!response.ok) {
          throw new Error(`Unable to load dataset (${response.status})`);
        }

        const payload = (await response.json()) as DashboardDataset;

        if (!cancelled) {
          setData(payload);
          setStatus("ready");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error");
          setStatus("error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, error, status };
}
