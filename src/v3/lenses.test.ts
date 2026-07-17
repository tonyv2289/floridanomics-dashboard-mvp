import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DashboardDataset } from "../types/dashboard";
import { LENSES, getLens, isLensId } from "./lenses";

const dataset = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/florida-economy.json"), "utf8"),
) as DashboardDataset;

describe("lens definitions stay in contract with the dataset", () => {
  const sectorIds = new Set(dataset.industry.sectors.map((sector) => sector.id));
  const innovationIds = new Set(Object.keys(dataset.innovation.metrics));
  const tradeHeroIds = new Set(dataset.trade.heroMetrics.map((metric) => metric.id));
  const clusterIds = new Set(dataset.strategy.clusters.map((cluster) => cluster.id));
  const projectIds = new Set(dataset.terminal.projectLedger.projects.map((project) => project.id));

  for (const lens of LENSES) {
    it(`${lens.id}: every referenced id exists in the dataset`, () => {
      for (const id of lens.sectorIds) {
        expect(sectorIds.has(id), `sector ${id}`).toBe(true);
      }
      for (const id of lens.innovationIds) {
        expect(innovationIds.has(id), `innovation metric ${id}`).toBe(true);
      }
      for (const id of lens.tradeHeroIds) {
        expect(tradeHeroIds.has(id), `trade hero ${id}`).toBe(true);
      }
      if (lens.clusterId) {
        expect(clusterIds.has(lens.clusterId), `cluster ${lens.clusterId}`).toBe(true);
      }
      for (const id of lens.projectIds) {
        expect(projectIds.has(id), `project ${id}`).toBe(true);
      }
    });

    it(`${lens.id}: has at least one sector and two watch items`, () => {
      expect(lens.sectorIds.length).toBeGreaterThan(0);
      expect(lens.watch.length).toBeGreaterThanOrEqual(2);
    });
  }
});

describe("lens helpers", () => {
  it("validates lens ids", () => {
    expect(isLensId("logistics")).toBe(true);
    expect(isLensId("strategy")).toBe(false);
    expect(isLensId(null)).toBe(false);
  });

  it("resolves lenses by id", () => {
    expect(getLens("tech").label).toBe("Tech & AI");
  });
});
