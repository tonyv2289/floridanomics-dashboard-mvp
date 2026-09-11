import { writeFile } from "node:fs/promises";
import { parseBlsCalendar } from "../src/lib/release-calendar";

const now = new Date(), year = now.getUTCFullYear();
const sourceUrl = `https://www.bls.gov/schedule/${year}/home.htm`;
const years = now.getUTCMonth() >= 10 ? [year, year + 1] : [year];
const releases = [];
for (const scheduledYear of years) {
  const response = await fetch(`https://www.bls.gov/schedule/${scheduledYear}/home.htm`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`BLS schedule HTTP ${response.status}; keeping prior calendar`);
  releases.push(...parseBlsCalendar(await response.text()));
}
for (const program of ["state-labor", "metro-labor", "county-wages"]) {
  if (!releases.some((release) => release.program === program)) throw new Error(`BLS schedule missing ${program}; keeping prior calendar`);
}
await writeFile(new URL("../public/data/release-calendar.json", import.meta.url), `${JSON.stringify({ checkedAt: now.toISOString().slice(0, 10), sourceUrl, releases }, null, 2)}\n`);
console.log(`Verified ${releases.length} official BLS release dates.`);
