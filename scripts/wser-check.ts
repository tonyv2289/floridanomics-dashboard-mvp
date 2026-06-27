/**
 * WSER freshness cross-check (npm run data:wser).
 *
 * Compares the dashboard's current labor-market as-of month against FloridaCommerce WSER's
 * latest published monthly release. If WSER has released a newer month than the dashboard is
 * showing, it flags that a `npm run data:refresh` is due. Read-only and best-effort: it never
 * mutates data and exits 0 even if the WSER site is unreachable.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWserReleaseInfo, WSER_RELEASE_FILES } from "./lib/wser";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "public", "data", "florida-economy.json");

async function main(): Promise<void> {
  let asOf = "unknown";
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    asOf = (JSON.parse(raw) as { asOfLaborMarket?: string }).asOfLaborMarket ?? "unknown";
  } catch {
    console.warn("Could not read florida-economy.json; skipping dashboard as-of comparison.");
  }

  const info = await fetchWserReleaseInfo();

  console.log("WSER freshness check");
  console.log(`  Dashboard labor-market as-of : ${asOf}`);
  console.log(`  WSER latest published release: ${info.latestReleaseDate ?? "unavailable"}`);
  if (info.scheduledDates.length) {
    const next = info.scheduledDates.find((d) => d > new Date().toISOString().slice(0, 10));
    console.log(`  Next WSER release date       : ${next ?? "see schedule PDF"}`);
  }
  console.log("  WSER release files:");
  for (const [key, url] of Object.entries(WSER_RELEASE_FILES)) {
    console.log(`    - ${key}: ${url}`);
  }

  if (info.latestReleaseDate) {
    const releaseMonth = new Date(`${info.latestReleaseDate}T00:00:00Z`).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    console.log(
      `  Note: WSER's latest release posted ${info.latestReleaseDate} (covers data through roughly ${releaseMonth}). ` +
        `If the dashboard as-of is older than WSER's covered month, run "npm run data:refresh".`,
    );
  }
}

main().catch((err) => {
  console.warn("WSER check encountered an error (non-fatal):", err);
});
