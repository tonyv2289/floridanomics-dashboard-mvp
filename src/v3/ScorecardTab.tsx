import type { CoreMetricId } from "../lib/dashboard";
import { IndustryTable, InsightBlock, MetricTable, MetroTable } from "./primitives";
import { ChartPanel } from "./ChartPanel";
import { FloridaMsaMap } from "../components/FloridaMsaMap";
import type { FloridaRegion } from "../hooks/usePreferences";
import type { DashboardDataset } from "../types/dashboard";

export function ScorecardTab({
  dataset,
  selectedMetricId,
  onSelectMetric,
  region,
  onSelectRegion,
}: {
  dataset: DashboardDataset;
  selectedMetricId: CoreMetricId;
  onSelectMetric: (metricId: CoreMetricId) => void;
  region: FloridaRegion;
  onSelectRegion: (region: FloridaRegion) => void;
}) {
  const selectedMetric = dataset.metrics[selectedMetricId];

  return (
    <>
      <ChartPanel
        metric={selectedMetric}
        title="Start with the live labor signal."
        note="The chart holds the active metric; the scorecard and evidence below carry the supporting context."
      />
      <MetricTable dataset={dataset} selectedMetricId={selectedMetricId} onSelect={onSelectMetric} />
      <InsightBlock section={dataset.scorecard2030} />
      <InsightBlock section={dataset.distinctives.snowbirdIndex} />
      <FloridaMsaMap
        metros={dataset.metros}
        selectedMetroId={region === "statewide" ? "" : region}
        onSelectMetro={(id) => onSelectRegion(id as FloridaRegion)}
      />
      <div className="v3-two-up">
        <IndustryTable dataset={dataset} />
        <MetroTable dataset={dataset} />
      </div>
    </>
  );
}
