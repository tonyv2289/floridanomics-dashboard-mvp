import { readFile, writeFile } from "node:fs/promises";
import { calendarAgeDays, keptCalendarIsCurrent, parseBlsCalendar, type ReleaseCalendar } from "../src/lib/release-calendar";

const now = new Date(), year = now.getUTCFullYear();
const sourceUrl = `https://www.bls.gov/schedule/${year}/home.htm`;
const target = new URL("../public/data/release-calendar.json", import.meta.url);
const years = now.getUTCMonth() >= 10 ? [year, year + 1] : [year];
const releases = [];
for (const scheduledYear of years) {
  const response = await fetch(`https://www.bls.gov/schedule/${scheduledYear}/home.htm`, { signal: AbortSignal.timeout(30000) });
  if (response.status === 403) {
    // BLS refuses some hosted runners. Do not work around the refusal, and do not restamp the kept file.
    // A calendar that a person verified recently still stands; an older one fails this check.
    const kept = JSON.parse(await readFile(target, "utf8")) as ReleaseCalendar;
    const days = calendarAgeDays(kept.checkedAt, now);
    if (!keptCalendarIsCurrent(kept.checkedAt, now)) throw new Error(`BLS schedule HTTP 403, and the kept calendar was last verified ${kept.checkedAt} (${days} days ago). Run npm run data:calendar from a workstation and commit the result.`);
    console.log(`::notice title=Release calendar::BLS refused this request (HTTP 403). The calendar verified on ${kept.checkedAt} (${days} days ago) stays in use and keeps that date.`);
    process.exit(0);
  }
  if (!response.ok) throw new Error(`BLS schedule HTTP ${response.status}; keeping prior calendar`);
  releases.push(...parseBlsCalendar(await response.text()));
}
for (const program of ["state-labor", "metro-labor", "county-wages"]) {
  if (!releases.some((release) => release.program === program)) throw new Error(`BLS schedule missing ${program}; keeping prior calendar`);
}
await writeFile(target, `${JSON.stringify({ checkedAt: now.toISOString().slice(0, 10), sourceUrl, releases }, null, 2)}\n`);
console.log(`Verified ${releases.length} official BLS release dates.`);
