import type { CoreMetricId } from "../lib/dashboard";
import { ChartPanel, IndustryTable, InsightBlock, MetricTable, MetroTable } from "./primitives";
import type { DashboardDataset } from "../types/dashboard";

export function ScorecardTab({
  dataset,
  selectedMetricId,
  onSelectMetric,
}: {
  dataset: DashboardDataset;
  selectedMetricId: CoreMetricId;
  onSelectMetric: (metricId: CoreMetricId) => void;
}) {
  const selectedMetric = dataset.metrics[selectedMetricId];

  return (
    <>
      <ChartPanel
        metric={selectedMetric}
        title="Start with the live labor signal."
        note="A good state dashboard should make the active metric obvious, then show the supporting evidence around it."
      />
      <MetricTable dataset={dataset} selectedMetricId={selectedMetricId} onSelect={onSelectMetric} />
      <InsightBlock section={dataset.scorecard2030} />
      <InsightBlock section={dataset.distinctives.snowbirdIndex} />
      <div className="v3-two-up">
        <IndustryTable dataset={dataset} />
        <MetroTable dataset={dataset} />
      </div>
    </>
  );
}
