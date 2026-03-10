import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DashboardDataset } from "../src/types/dashboard";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "public", "data", "florida-economy.json");

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function ensure(condition: unknown, message: string, errors: string[]) {
  if (!condition) {
    errors.push(message);
  }
}

async function main() {
  const errors: string[] = [];
  const raw = await readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw) as DashboardDataset;

  ensure(typeof data.generatedAt === "string" && data.generatedAt.length > 0, "Missing generatedAt", errors);
  ensure(typeof data.asOfLaborMarket === "string" && data.asOfLaborMarket.length > 0, "Missing asOfLaborMarket", errors);
  ensure(typeof data.asOfPopulation === "string" && data.asOfPopulation.length > 0, "Missing asOfPopulation", errors);

  ensure(data.heroMetrics.length >= 4, "heroMetrics should have at least 4 entries", errors);

  for (const metricId of data.heroMetrics) {
    const metric = data.metrics[metricId];
    ensure(Boolean(metric), `Missing hero metric object: ${metricId}`, errors);
  }

  const coreMetricIds: Array<keyof DashboardDataset["metrics"]> = [
    "unemploymentRate",
    "laborForce",
    "employmentLevel",
    "nonfarmPayrolls",
    "population",
  ];

  for (const metricId of coreMetricIds) {
    const metric = data.metrics[metricId];
    ensure(metric.series.length > 0, `Metric ${metricId} has empty series`, errors);
    ensure(metric.sparkline.length > 0, `Metric ${metricId} has empty sparkline`, errors);
    ensure(isFiniteNumber(metric.latest.value), `Metric ${metricId} has invalid latest value`, errors);
    ensure(typeof metric.latest.date === "string" && metric.latest.date.length > 0, `Metric ${metricId} missing latest date`, errors);
  }

  ensure(data.industry.sectors.length >= 8, "Industry sectors should include major categories", errors);
  ensure(data.industry.strongestGrowers.length > 0, "Missing strongestGrowers", errors);
  ensure(data.industry.laggards.length > 0, "Missing laggards", errors);

  ensure(data.metros.length === 4, "Expected exactly four metro cards", errors);
  const requiredMetros = ["Miami MSA", "Tampa MSA", "Orlando MSA", "Jacksonville MSA"];
  for (const metroName of requiredMetros) {
    ensure(data.metros.some((metro) => metro.name === metroName), `Missing metro ${metroName}`, errors);
  }

  ensure(data.narrative.whatStandsOut.length > 0, "Narrative missing whatStandsOut", errors);
  ensure(data.narrative.improving.length > 0, "Narrative missing improving", errors);
  ensure(data.narrative.softening.length > 0, "Narrative missing softening", errors);
  ensure(data.narrative.whyItMatters.length > 0, "Narrative missing whyItMatters", errors);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    throw new Error(`Data validation failed with ${errors.length} issue(s).`);
  }

  console.log("Dataset contract looks valid.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
