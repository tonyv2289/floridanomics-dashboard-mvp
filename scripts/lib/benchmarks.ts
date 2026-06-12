import type { BenchmarkPowerRow, BenchmarksSection, BenchmarkWageRow } from "../../src/types/dashboard";
import { withRetry } from "./sources";

export const BENCHMARK_STATES = [
  { id: "FL", name: "Florida", fips: "12000" },
  { id: "TX", name: "Texas", fips: "48000" },
  { id: "GA", name: "Georgia", fips: "13000" },
  { id: "NC", name: "North Carolina", fips: "37000" },
  { id: "TN", name: "Tennessee", fips: "47000" },
  { id: "AZ", name: "Arizona", fips: "04000" },
  { id: "UT", name: "Utah", fips: "49000" },
  { id: "CA", name: "California", fips: "06000" },
] as const;

const QCEW_AVG_WAGE_COLUMN = 15;
const QCEW_YOY_WAGE_PCT_COLUMN = 41;

export function parseQcewTotalRow(csv: string): { avgWeeklyWage: number; yoyPercent: number | null } | null {
  for (const line of csv.trim().split("\n").slice(1)) {
    const fields = line.split(",").map((field) => field.replace(/^"|"$/g, ""));
    if (fields[1] !== "0" || fields[2] !== "10" || fields[3] !== "50") {
      continue;
    }

    const wage = Number.parseFloat(fields[QCEW_AVG_WAGE_COLUMN]);
    if (!Number.isFinite(wage)) {
      return null;
    }

    const yoy = Number.parseFloat(fields[QCEW_YOY_WAGE_PCT_COLUMN]);
    return { avgWeeklyWage: wage, yoyPercent: Number.isFinite(yoy) ? yoy : null };
  }
  return null;
}

async function fetchQcewCsv(fips: string, year: number, quarter: number): Promise<string | null> {
  const response = await fetch(`https://data.bls.gov/cew/data/api/${year}/${quarter}/area/${fips}.csv`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`QCEW request failed for ${fips} ${year} Q${quarter} with HTTP ${response.status}`);
  }
  return response.text();
}

export function candidateQuarters(now: Date): Array<{ year: number; quarter: number }> {
  const year = now.getUTCFullYear();
  const candidates: Array<{ year: number; quarter: number }> = [];
  for (let y = year; y >= year - 2 && candidates.length < 8; y -= 1) {
    for (let q = 4; q >= 1; q -= 1) {
      candidates.push({ year: y, quarter: q });
    }
  }
  return candidates.slice(0, 8);
}

async function buildWageRows(): Promise<{ period: string; rows: BenchmarkWageRow[] }> {
  let resolved: { year: number; quarter: number; csv: string } | null = null;
  for (const candidate of candidateQuarters(new Date())) {
    const csv = await withRetry(() => fetchQcewCsv(BENCHMARK_STATES[0].fips, candidate.year, candidate.quarter));
    if (csv && parseQcewTotalRow(csv)) {
      resolved = { ...candidate, csv };
      break;
    }
  }

  if (!resolved) {
    throw new Error("No QCEW quarter available for Florida.");
  }

  const rows: BenchmarkWageRow[] = [];
  for (const state of BENCHMARK_STATES) {
    const csv =
      state.fips === BENCHMARK_STATES[0].fips
        ? resolved.csv
        : await withRetry(() => fetchQcewCsv(state.fips, resolved.year, resolved.quarter));
    const parsed = csv ? parseQcewTotalRow(csv) : null;
    if (parsed) {
      rows.push({ stateId: state.id, name: state.name, ...parsed });
    }
  }

  rows.sort((a, b) => a.avgWeeklyWage - b.avgWeeklyWage);
  return { period: `${resolved.year} Q${resolved.quarter}`, rows };
}

type EiaRow = { period?: string; stateid?: string; price?: number | string };

export function latestPricePerState(rows: EiaRow[]): Map<string, { price: number; period: string }> {
  const byState = new Map<string, { price: number; period: string }>();
  for (const row of rows) {
    const stateId = row.stateid ?? "";
    const price = Number(row.price);
    if (!stateId || !row.period || !Number.isFinite(price) || byState.has(stateId)) {
      continue;
    }
    byState.set(stateId, { price, period: row.period });
  }
  return byState;
}

async function buildPowerRows(): Promise<BenchmarkPowerRow[] | null> {
  const key = process.env.EIA_API_KEY?.trim();
  if (!key) {
    return null;
  }

  const url = new URL("https://api.eia.gov/v2/electricity/retail-sales/data/");
  url.searchParams.set("api_key", key);
  url.searchParams.set("frequency", "monthly");
  url.searchParams.set("data[0]", "price");
  for (const state of BENCHMARK_STATES) {
    url.searchParams.append("facets[stateid][]", state.id);
  }
  url.searchParams.set("facets[sectorid][]", "IND");
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", String(BENCHMARK_STATES.length * 3));

  const response = await withRetry(async () => {
    const result = await fetch(url);
    if (!result.ok) {
      throw new Error(`EIA benchmark request failed with HTTP ${result.status}`);
    }
    return result.json() as Promise<{ response?: { data?: EiaRow[] } }>;
  });

  const byState = latestPricePerState(response.response?.data ?? []);
  const rows: BenchmarkPowerRow[] = [];
  for (const state of BENCHMARK_STATES) {
    const entry = byState.get(state.id);
    if (entry) {
      rows.push({
        stateId: state.id,
        name: state.name,
        industrialCentsPerKwh: entry.price,
        period: entry.period,
      });
    }
  }

  rows.sort((a, b) => a.industrialCentsPerKwh - b.industrialCentsPerKwh);
  return rows.length > 0 ? rows : null;
}

export async function buildBenchmarksSection(): Promise<BenchmarksSection> {
  const wages = await buildWageRows();

  let power: BenchmarksSection["power"] = null;
  try {
    const rows = await buildPowerRows();
    if (rows) {
      power = {
        rows,
        source: { label: "EIA electricity retail sales", url: "https://www.eia.gov/electricity/data.php" },
      };
    }
  } catch (error) {
    console.warn(`Power benchmark skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    headline: "The cost of operating, against the same eight states.",
    summary:
      "Site decisions come down to operating math. Average weekly wages show what labor costs across the peer set; industrial power prices show what the capex-heavy projects will pay to run.",
    wages: {
      ...wages,
      source: { label: "BLS QCEW, total covered employment", url: "https://www.bls.gov/cew/" },
    },
    power,
  };
}
