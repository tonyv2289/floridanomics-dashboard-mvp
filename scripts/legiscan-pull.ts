/**
 * Pull the Florida policy watch-list from LegiScan into public/data/policy-watch.json.
 * Run in CI (npm run data:legiscan). Activates when LEGISCAN_API_KEY is set; without the
 * key it writes a "pending" file so the UI shows a graceful connect state.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchFloridaWatchlist } from "./lib/legiscan";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data", "policy-watch.json");

// Florida economic-policy watch-list. Expand as bills of interest come up.
const WATCH_BILLS = ["SB 484"];

function write(payload: unknown): void {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main(): Promise<void> {
  const apiKey = process.env.LEGISCAN_API_KEY;
  if (!apiKey) {
    write({
      status: "pending",
      generatedAt: null,
      items: [],
      note: "Set LEGISCAN_API_KEY to activate Florida policy tracking.",
    });
    console.log("LegiScan: no API key; wrote pending policy-watch.json.");
    return;
  }

  try {
    const items = await fetchFloridaWatchlist(apiKey, WATCH_BILLS);
    write({
      status: "live",
      generatedAt: new Date().toISOString(),
      attribution: "Legislative data via LegiScan (CC BY 4.0).",
      items,
    });
    console.log(`LegiScan: wrote ${items.length} tracked bill(s).`);
  } catch (error) {
    console.warn("LegiScan pull failed (non-fatal); leaving existing file:", error);
  }
}

void main();
