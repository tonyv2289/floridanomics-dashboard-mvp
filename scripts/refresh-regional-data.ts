import { readFile, writeFile } from "node:fs/promises";
import { buildCountyBenchmarks, completedQuarters } from "./lib/regional-qcew";

const output = new URL("../public/data/regional-economy.json", import.meta.url);
const previous = await readFile(output, "utf8").then(JSON.parse).catch(() => null);
const now = new Date();
let updated = false;
for (const { year, quarter } of completedQuarters(now)) {
  // A not-yet-published quarter is normal. Never substitute estimates for data.
  const url = `https://data.bls.gov/cew/data/api/${year}/${quarter}/industry/10.csv`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) { console.warn(`QCEW ${year} Q${quarter}: HTTP ${response.status}`); continue; }
    const next = buildCountyBenchmarks(await response.text(), year, quarter, now.toISOString().slice(0, 10));
    if (previous && next.quarterEnd < previous.quarterEnd) throw new Error("Refusing to regress the regional observation period");
    await writeFile(output, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`Verified ${next.counties.length} county benchmarks for ${next.period}.`);
    updated = true;
    break;
  } catch (error) {
    console.warn(`QCEW ${year} Q${quarter}: ${error instanceof Error ? error.message : "unavailable"}`);
  }
}
if (!updated) {
  console.error("Regional refresh unavailable; retained the last verified file and its retrieval date.");
  process.exitCode = 1;
}
