/**
 * One-off: add the benchmarks section to the existing dataset without a full
 * refresh. Scheduled refreshes regenerate it via buildBenchmarksSection() in
 * scripts/refresh-data.ts. Power rows populate only where EIA_API_KEY is set
 * (the GitHub Actions environment), so locally this may write wages only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DashboardDataset } from "../src/types/dashboard";
import { buildBenchmarksSection } from "./lib/benchmarks";

const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "public/data/florida-economy.json");

const dataset = JSON.parse(readFileSync(DATA_FILE, "utf8")) as DashboardDataset;
dataset.benchmarks = await buildBenchmarksSection();
writeFileSync(DATA_FILE, `${JSON.stringify(dataset, null, 2)}\n`);

console.log(`wages (${dataset.benchmarks.wages.period}):`);
for (const row of dataset.benchmarks.wages.rows) {
  console.log(`  ${row.stateId}: $${row.avgWeeklyWage}/wk (${row.yoyPercent ?? "n/a"}% YoY)`);
}
console.log(`power: ${dataset.benchmarks.power ? `${dataset.benchmarks.power.rows.length} states` : "skipped (no EIA_API_KEY)"}`);
