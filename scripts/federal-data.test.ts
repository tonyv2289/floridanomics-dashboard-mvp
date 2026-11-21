import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCensusStateExports } from "./federal-data";

const DATASET = "https://api.census.gov/data/timeseries/intltrade/exports/statehs";

function censusAnswers(table: string[][], status = 200) {
  const fetchMock = vi.fn<(url: URL | string) => Promise<Response>>(async () => new Response(JSON.stringify(table), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchCensusStateExports", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks the current Census dataset for the December year-to-date total and reads Florida's row", async () => {
    vi.stubEnv("CENSUS_API_KEY", "test-key");
    const fetchMock = censusAnswers([
      ["STATE", "ALL_VAL_YR", "time"],
      ["-", "2000000000000", "2025-12"],
      ["FL", "79100000000", "2025-12"],
      ["GA", "50000000000", "2025-12"],
    ]);

    const result = await fetchCensusStateExports("2025");

    const requested = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requested.origin + requested.pathname).toBe(DATASET);
    expect(requested.searchParams.get("get")).toBe("STATE,ALL_VAL_YR");
    expect(requested.searchParams.get("time")).toBe("2025-12");
    expect(requested.searchParams.has("for")).toBe(false);
    expect(result).toEqual({ valueUsd: 79_100_000_000, period: "2025-12", url: `${DATASET}.html` });
  });

  it("makes no request without a key", async () => {
    vi.stubEnv("CENSUS_API_KEY", "");
    const fetchMock = censusAnswers([]);

    expect(await fetchCensusStateExports("2025")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails when Census answers with an error, so the caller keeps the cached figure", async () => {
    vi.stubEnv("CENSUS_API_KEY", "test-key");
    censusAnswers([], 404);

    await expect(fetchCensusStateExports("2025")).rejects.toThrow("HTTP 404");
  });

  it("fails when Florida's total is missing or split across rows, and never guesses", async () => {
    vi.stubEnv("CENSUS_API_KEY", "test-key");
    censusAnswers([["STATE", "ALL_VAL_YR", "time"], ["GA", "50000000000", "2025-12"]]);
    await expect(fetchCensusStateExports("2025")).rejects.toThrow("held 0 Florida rows");

    censusAnswers([
      ["STATE", "E_COMMODITY", "ALL_VAL_YR", "time"],
      ["FL", "84", "9000000000", "2025-12"],
      ["FL", "85", "8000000000", "2025-12"],
    ]);
    await expect(fetchCensusStateExports("2025")).rejects.toThrow("held 2 Florida rows");

    censusAnswers([["STATE", "ALL_VAL_YR", "time"], ["FL", "", "2025-12"]]);
    await expect(fetchCensusStateExports("2025")).rejects.toThrow("numeric Florida ALL_VAL_YR");
  });
});
