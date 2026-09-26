/**
 * Add or update the Florida-versus-peers state investment comparison without a full refresh.
 *
 * Input: scripts/data/state-investment-comparison.json and scripts/data/megaprojects-1b-2022-2026.csv, both
 * exported by the Florida Brain state investment tracker (docs/state-investment-comparison.md). The section lives in
 * the curated competition layer, so scheduled refreshes preserve it; rerun this script when the tracker exports again.
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompetitionSource, DashboardDataset, StateInvestmentComparison } from "../src/types/dashboard";
import { assertPublicDataset } from "./lib/public-data";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = join(ROOT, "public/data/florida-economy.json");
const INPUT = join(ROOT, "scripts/data/state-investment-comparison.json");
const CSV_IN = join(ROOT, "scripts/data/megaprojects-1b-2022-2026.csv");
const CSV_OUT = join(ROOT, "public/data/megaprojects-1b-2022-2026.csv");

type TrackerExport = StateInvestmentComparison & { sources: CompetitionSource[] };

const exported = JSON.parse(readFileSync(INPUT, "utf8")) as TrackerExport;
if (exported.schemaVersion !== 1) throw new Error(`Unsupported state investment schema ${String(exported.schemaVersion)}`);
const { sources, ...section } = exported;

const dataset = JSON.parse(readFileSync(DATA_FILE, "utf8")) as DashboardDataset;
const byId = new Map(dataset.competition.sources.map((source) => [source.id, source]));
for (const source of sources) byId.set(source.id, source);
dataset.competition.sources = [...byId.values()];
dataset.competition.stateInvestment = section;

assertPublicDataset(dataset);
// Minified like scripts/refresh-data.ts writes it (the dashboard fetches the whole payload on load).
writeFileSync(DATA_FILE, `${JSON.stringify(dataset)}\n`);
copyFileSync(CSV_IN, CSV_OUT);

console.log(`state investment comparison: ${section.measures.length} measures, ${sources.length} sources, cutoff ${section.evidenceCutoff}`);
for (const measure of section.measures) {
  console.log(`  ${measure.id}: Florida ${measure.florida.value} (rank ${measure.florida.rank} of ${measure.florida.rankOf})`);
}
