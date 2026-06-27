import { useState } from "react";
import { type CoreMetricId, formatMetricValue } from "../lib/dashboard";
import { Frame } from "./primitives";
import type { DashboardDataset } from "../types/dashboard";

const EXPORT_METRICS: CoreMetricId[] = ["unemploymentRate", "nonfarmPayrolls", "laborForce", "employmentLevel"];

function siteUrl(): string {
  if (typeof window === "undefined") {
    return "https://tonyv2289.github.io/floridanomics-dashboard-mvp/";
  }
  return window.location.origin + window.location.pathname;
}

export function EvidenceExport({ dataset }: { dataset: DashboardDataset }) {
  const [copied, setCopied] = useState(false);

  const lines = EXPORT_METRICS.map((id) => {
    const metric = dataset.metrics[id];
    return `- ${metric.label}: ${formatMetricValue(metric, metric.latest.value)} (as of ${dataset.asOfLaborMarket})`;
  });

  const citations = dataset.sources
    .filter((source) => ["bls", "wser_floridacommerce", "census_population"].includes(source.id))
    .map((source) => `${source.name}: ${source.url}`);

  const block = [
    `Florida labor market, as of ${dataset.asOfLaborMarket}:`,
    ...lines,
    "",
    "Sources:",
    ...citations.map((citation) => `- ${citation}`),
    "",
    `Compiled by Floridanomics: ${siteUrl()}`,
  ].join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(block);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Frame label="Evidence export">
      <div className="v3-panel-head">
        <div>
          <h2>Cite these numbers.</h2>
          <p>Copy a sourced, board-ready evidence block for the current Florida labor read.</p>
        </div>
        <button type="button" className="v3-reload-button" onClick={copy}>
          {copied ? "Copied" : "Copy evidence"}
        </button>
      </div>
      <pre className="v3-evidence-block">{block}</pre>
    </Frame>
  );
}
