import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TalentMatchLayer } from "../types/dashboard";
import {
  filterTalentClusters,
  getTalentCoverage,
  getTalentCoverageBand,
  isTalentClusterId,
  summarizeTalentMatch,
} from "./talent-match";

const layer = JSON.parse(
  readFileSync(join(process.cwd(), "data/talent-match.json"), "utf8"),
) as TalentMatchLayer;

describe("Talent Match", () => {
  it("keeps the seven strategic pathways in the curated layer", () => {
    expect(layer.clusters).toHaveLength(7);
    expect(isTalentClusterId("aerospace-space", layer)).toBe(true);
    expect(isTalentClusterId("tourism", layer)).toBe(false);
  });

  it("calculates the directional coverage proxy", () => {
    const logistics = layer.clusters.find((cluster) => cluster.id === "logistics")!;
    const aerospace = layer.clusters.find((cluster) => cluster.id === "aerospace-space")!;

    expect(getTalentCoverage(logistics)).toBeCloseTo(152 / 1540);
    expect(getTalentCoverageBand(logistics)).toBe("thin");
    expect(getTalentCoverageBand(aerospace)).toBe("broad");
  });

  it("filters fast-growth and project-linked pathways", () => {
    expect(filterTalentClusters(layer.clusters, "fast", "growth").map((cluster) => cluster.id)).toEqual([
      "ai-software",
      "logistics",
      "aerospace-space",
    ]);
    expect(filterTalentClusters(layer.clusters, "projects", "coverage").map((cluster) => cluster.id)).toEqual([
      "aerospace-space",
      "life-sciences",
    ]);
  });

  it("summarizes covered openings, graduates, and project pressure", () => {
    const summary = summarizeTalentMatch(layer);
    expect(summary.totalAnnualOpenings).toBe(25210);
    expect(summary.coveredGraduates).toBe(9028);
    expect(summary.thinCoverageCount).toBe(3);
    expect(summary.linkedProjectCount).toBe(10);
    expect(summary.weightedAverageWage).toBeGreaterThan(70_000);
  });
});
