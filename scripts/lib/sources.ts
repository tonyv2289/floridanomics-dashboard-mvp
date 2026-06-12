import type { TimePoint } from "../../src/types/dashboard";
import { parseBlsMonthly, type BlsSeries } from "./series";

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 2000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt + 1} failed (${message}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error("Unreachable");
}

type BlsFetchOptions = {
  startYear: string;
  endYear: string;
};

export async function fetchBlsSeries(
  seriesIds: string[],
  { startYear, endYear }: BlsFetchOptions,
): Promise<Record<string, TimePoint[]>> {
  const result: Record<string, TimePoint[]> = {};

  const chunkSize = 24;
  for (let start = 0; start < seriesIds.length; start += chunkSize) {
    const chunk = seriesIds.slice(start, start + chunkSize);
    await withRetry(async () => {
      const response = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seriesid: chunk,
          startyear: startYear,
          endyear: endYear,
          ...(process.env.BLS_API_KEY ? { registrationkey: process.env.BLS_API_KEY } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`BLS request failed with HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        status: string;
        message?: string[];
        Results?: {
          series: BlsSeries[];
        };
      };

      if (payload.status !== "REQUEST_SUCCEEDED" || !payload.Results?.series) {
        throw new Error(`BLS request unsuccessful: ${payload.message?.join("; ") ?? "unknown error"}`);
      }

      for (const series of payload.Results.series) {
        result[series.seriesID] = parseBlsMonthly(series);
      }
    });
  }

  return result;
}

export async function fetchFredSeries(
  seriesId: string,
  transformValue?: (value: number) => number,
): Promise<TimePoint[]> {
  const csv = await withRetry(async () => {
    const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`);
    if (!response.ok) {
      throw new Error(`FRED series request failed for ${seriesId} with HTTP ${response.status}`);
    }
    return response.text();
  });
  const lines = csv.trim().split("\n").slice(1);

  return lines
    .map((line) => {
      const [date, rawValue] = line.split(",");
      if (!date || !rawValue || rawValue === ".") {
        return null;
      }

      const thousands = Number.parseFloat(rawValue);
      if (!Number.isFinite(thousands)) {
        return null;
      }

      const transformed = transformValue ? transformValue(thousands) : thousands;

      return {
        date,
        value: transformed,
      };
    })
    .filter((point): point is TimePoint => Boolean(point))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const INDEED_STATE_POSTINGS_URL =
  "https://raw.githubusercontent.com/hiring-lab/job_postings_tracker/master/US/state_job_postings_us.csv";

export async function fetchIndeedStatePostings(stateCode: string): Promise<TimePoint[]> {
  const csv = await withRetry(async () => {
    const response = await fetch(INDEED_STATE_POSTINGS_URL);
    if (!response.ok) {
      throw new Error(`Indeed postings request failed with HTTP ${response.status}`);
    }
    return response.text();
  });

  const target = stateCode.toLowerCase();

  return csv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [date, state, rawValue] = line.split(",");
      if (!date || state?.toLowerCase() !== target || !rawValue) {
        return null;
      }

      const value = Number.parseFloat(rawValue);
      if (!Number.isFinite(value)) {
        return null;
      }

      return { date, value };
    })
    .filter((point): point is TimePoint => Boolean(point))
    .sort((a, b) => a.date.localeCompare(b.date));
}
