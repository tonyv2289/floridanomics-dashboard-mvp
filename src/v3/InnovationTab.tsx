import { startTransition } from "react";
import clsx from "clsx";
import {
  INNOVATION_METRIC_IDS,
  deltaTone,
  formatDelta,
  formatMetricValue,
} from "../lib/dashboard";
import { ChartPanel, Frame, InsightBlock } from "./primitives";
import type { DashboardDataset, InnovationMetricId } from "../types/dashboard";

export function InnovationTab({
  dataset,
  selectedMetricId,
  onSelectMetric,
}: {
  dataset: DashboardDataset;
  selectedMetricId: InnovationMetricId;
  onSelectMetric: (metricId: InnovationMetricId) => void;
}) {
  const selectedMetric = dataset.innovation.metrics[selectedMetricId];

  return (
    <>
      <ChartPanel
        metric={selectedMetric}
        title="Formation, output, and advanced jobs need one focal signal."
        note="The useful read is the spread between new company formation and the depth of Florida's knowledge-work bench."
        accent="teal"
      />

      <Frame label="Innovation signals">
        <div className="v3-toggle-grid">
          {INNOVATION_METRIC_IDS.map((metricId) => {
            const metric = dataset.innovation.metrics[metricId];
            return (
              <button
                key={metricId}
                type="button"
                className={clsx("v3-toggle-card", selectedMetricId === metricId && "is-active")}
                onClick={() => startTransition(() => onSelectMetric(metricId))}
              >
                <span>{metric.label}</span>
                <strong>{formatMetricValue(metric, metric.latest.value)}</strong>
                <small className={clsx(`tone-${deltaTone(metric, metric.deltas.oneYear)}`)}>
                  {formatDelta(metric, metric.deltas.oneYear)}
                </small>
              </button>
            );
          })}
        </div>
      </Frame>

      <InsightBlock section={dataset.distinctives.spaceCoastCadence} />

      <Frame label="Resource stack">
        <div className="v3-resource-list">
          {dataset.innovation.resources.map((resource) => (
            <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer">
              <span>{resource.region}</span>
              <strong>{resource.name}</strong>
              <small>{resource.category}</small>
            </a>
          ))}
        </div>
      </Frame>
    </>
  );
}
