/**
 * One-off: add the leading-indicators section to the existing dataset without
 * running a full data refresh. Subsequent scheduled refreshes regenerate it
 * via the same buildLeadingSection() in scripts/refresh-data.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DashboardDataset } from "../src/types/dashboard";
import { buildLeadingSection } from "./lib/leading";

const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "public/data/florida-economy.json");

const dataset = JSON.parse(readFileSync(DATA_FILE, "utf8")) as DashboardDataset;
dataset.leading = await buildLeadingSection();
writeFileSync(DATA_FILE, `${JSON.stringify(dataset, null, 2)}\n`);

for (const signal of dataset.leading.signals) {
  console.log(
    `${signal.id}: ${signal.latest.date} = ${signal.latest.value}` +
      ` | recent ${signal.changes.recent?.percent?.toFixed(1) ?? "n/a"}%` +
      ` | yoy ${signal.changes.yearOver?.percent?.toFixed(1) ?? "n/a"}%`,
  );
}
