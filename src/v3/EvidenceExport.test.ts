import { describe, expect, it } from "vitest";
import type { DashboardDataset } from "../types/dashboard";
import { blsReleaseCitation, buildEvidenceBlock } from "./evidence-export";

function dataset(latestReleaseDate: string | null): DashboardDataset {
  const metric = (label: string, unit: string, value: number) => ({ label, unit, latest: { date: "2026-10-01", value } });
  return {
    asOfLaborMarket: "October 2026",
    metrics: {
      unemploymentRate: metric("Unemployment Rate", "percent", 4.3),
      nonfarmPayrolls: metric("Nonfarm Payrolls", "thousands_jobs", 10043.2),
      laborForce: metric("Labor Force", "persons", 11120536),
      employmentLevel: metric("Employment Level", "persons", 10643122),
    },
    trust: { releaseCalendar: [{ id: "florida-labor", latestReleaseDate }] },
    sources: [{ id: "wser_floridacommerce", name: "FloridaCommerce WSER", url: "https://floridajobs.org/wser-home/about-wser" }],
  } as unknown as DashboardDataset;
}

describe("evidence export", () => {
  it("cites the archived BLS release when its date has been read", () => {
    expect(blsReleaseCitation("2026-11-20")).toBe(
      "BLS State Employment and Unemployment, released November 20, 2026: https://www.bls.gov/news.release/archives/laus_11202026.htm",
    );
  });

  it("cites the current BLS release when no release date is recorded", () => {
    expect(blsReleaseCitation(null)).toContain("https://www.bls.gov/news.release/laus.nr0.htm");
  });

  it("gives full figures a memo can use, with one date line", () => {
    const block = buildEvidenceBlock(dataset("2026-11-20"), "https://www.floridanomics.com/");
    expect(block).toContain("Florida labor market, October 2026 (seasonally adjusted):");
    expect(block).toContain("- Unemployment Rate: 4.3%");
    expect(block).toContain("- Nonfarm Payrolls: 10,043,200");
    expect(block).toContain("- Labor Force: 11,120,536");
    expect(block).toContain("- Employment Level: 10,643,122");
    expect(block).toContain("laus_11202026.htm");
    expect(block).toContain("- FloridaCommerce WSER: https://floridajobs.org/wser-home/about-wser");
    expect(block).not.toContain("10M");
    expect(block).not.toContain("as of October 2026)");
  });
});
