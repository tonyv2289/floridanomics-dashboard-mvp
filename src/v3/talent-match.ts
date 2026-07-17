import type { TalentCluster, TalentMatchLayer } from "../types/dashboard";

export const DEFAULT_TALENT_CLUSTER_ID = "healthcare";

export type TalentFocus = "all" | "under-50" | "fast-growth" | "project-linked";
export type TalentSort = "coverage" | "openings" | "growth" | "wage";
export type TalentCoverageBand = "thin" | "watch" | "broad";

export function isTalentFocus(value: string | null): value is TalentFocus {
  return value === "all" || value === "under-50" || value === "fast-growth" || value === "project-linked";
}

export function isTalentSort(value: string | null): value is TalentSort {
  return value === "coverage" || value === "openings" || value === "growth" || value === "wage";
}

export function getTalentCoverage(cluster: TalentCluster): number {
  return cluster.pipeline.graduates / cluster.demand.annualOpenings;
}

export function getTalentCoverageBand(cluster: TalentCluster): TalentCoverageBand {
  const coverage = getTalentCoverage(cluster);
  if (coverage < 0.25) return "thin";
  if (coverage < 0.75) return "watch";
  return "broad";
}

export function filterTalentClusters(
  clusters: TalentCluster[],
  focus: TalentFocus,
  sort: TalentSort,
): TalentCluster[] {
  return clusters
    .filter((cluster) => {
      if (focus === "under-50") return getTalentCoverage(cluster) < 0.5;
      if (focus === "fast-growth") return cluster.demand.growthPercent >= 20;
      if (focus === "project-linked") return cluster.projectIds.length > 0;
      return true;
    })
    .sort((a, b) => {
      if (sort === "openings") return b.demand.annualOpenings - a.demand.annualOpenings;
      if (sort === "growth") return b.demand.growthPercent - a.demand.growthPercent;
      if (sort === "wage") return b.pipeline.averageAnnualWageUsd - a.pipeline.averageAnnualWageUsd;
      return getTalentCoverage(a) - getTalentCoverage(b);
    });
}

export function summarizeTalentMatch(layer: TalentMatchLayer) {
  const totalAnnualOpenings = layer.clusters.reduce((sum, cluster) => sum + cluster.demand.annualOpenings, 0);
  const coveredGraduates = layer.clusters.reduce((sum, cluster) => sum + cluster.pipeline.graduates, 0);
  const fullTimeWorkers = layer.clusters.reduce((sum, cluster) => sum + cluster.pipeline.fullTimeEmployed, 0);
  const weightedWages = layer.clusters.reduce(
    (sum, cluster) => sum + cluster.pipeline.averageAnnualWageUsd * cluster.pipeline.fullTimeEmployed,
    0,
  );

  return {
    totalAnnualOpenings,
    coveredGraduates,
    weightedAverageWage: fullTimeWorkers > 0 ? weightedWages / fullTimeWorkers : 0,
    thinCoverageCount: layer.clusters.filter((cluster) => getTalentCoverage(cluster) < 0.5).length,
    linkedProjectCount: new Set(layer.clusters.flatMap((cluster) => cluster.projectIds)).size,
  };
}

export function isTalentClusterId(value: string | null, layer: TalentMatchLayer): value is string {
  return value !== null && layer.clusters.some((cluster) => cluster.id === value);
}
