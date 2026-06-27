import { type CoreMetricId, formatDelta, formatMetricValue } from "../lib/dashboard";
import { Frame } from "./primitives";
import type { FloridaRegion } from "../hooks/usePreferences";
import type { DashboardDataset } from "../types/dashboard";

const SCANNED: CoreMetricId[] = ["unemploymentRate", "laborForce", "nonfarmPayrolls", "employmentLevel"];

type Flag = { label: string; detail: string };

function movedBadly(trendDirection: "up_good" | "down_good", oneYearAbsolute: number): boolean {
  if (oneYearAbsolute === 0) {
    return false;
  }
  return trendDirection === "up_good" ? oneYearAbsolute < 0 : oneYearAbsolute > 0;
}

export function AttentionStrip({ dataset, region }: { dataset: DashboardDataset; region: FloridaRegion }) {
  const flags: Flag[] = [];

  for (const id of SCANNED) {
    const metric = dataset.metrics[id];
    const absolute = metric.deltas.oneYear?.absolute ?? 0;
    if (movedBadly(metric.trendDirection, absolute)) {
      flags.push({
        label: metric.label,
        detail: `${formatMetricValue(metric, metric.latest.value)}, ${formatDelta(metric, metric.deltas.oneYear)} over one year`,
      });
    }
  }

  if (region !== "statewide") {
    const metro = dataset.metros.find((m) => m.id === region);
    if (metro) {
      const unemploymentDelta = metro.unemploymentRate.deltas.oneYear?.absolute ?? 0;
      if (unemploymentDelta > 0) {
        flags.push({
          label: `${metro.name} unemployment`,
          detail: `${metro.unemploymentRate.latest.value.toFixed(1)}%, up ${unemploymentDelta.toFixed(1)} points over one year`,
        });
      }
    }
  }

  const regionLabel = region === "statewide" ? "Florida" : (dataset.metros.find((m) => m.id === region)?.name ?? "Florida");

  return (
    <Frame label="What needs your attention">
      <div className="v3-panel-head">
        <div>
          <h2>{flags.length > 0 ? `${flags.length} signal${flags.length > 1 ? "s" : ""} moving the wrong way` : "Momentum looks clean"}</h2>
          <p>
            {flags.length > 0
              ? `For ${regionLabel}, these moved against trend in the latest data.`
              : `For ${regionLabel}, no core labor signal moved against trend in the latest data.`}
          </p>
        </div>
      </div>
      {flags.length > 0 ? (
        <ul className="v3-attention-list">
          {flags.map((flag) => (
            <li key={flag.label}>
              <span className="v3-attention-dot tone-warn" aria-hidden="true" />
              <span>
                <strong>{flag.label}:</strong> {flag.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Frame>
  );
}
