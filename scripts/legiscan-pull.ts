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

// Florida economic-policy watch-list (2026 Regular Session). Review each session.
const WATCH_BILLS = ["H0847", "H0385", "H0659", "H0899", "H0325"];

function reviewMetadata(reviewedAt: string) {
  const nextReview = new Date(reviewedAt);
  nextReview.setUTCDate(nextReview.getUTCDate() + 7);
  return {
    reviewedAt,
    nextReviewDue: nextReview.toISOString(),
    cadence: "weekly",
    owner: "Floridanomics editorial desk",
    session: "2026 Regular Session - post-session outcomes",
    coverageNote:
      "A focused economic-development, technology, workforce, and innovation watch list; not a complete inventory of Florida legislation.",
  };
}

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
      ...reviewMetadata(new Date().toISOString()),
      items: [],
      note: "Set LEGISCAN_API_KEY to activate Florida policy tracking.",
    });
    console.log("LegiScan: no API key; wrote pending policy-watch.json.");
    return;
  }

  try {
    const items = await fetchFloridaWatchlist(apiKey, WATCH_BILLS);
    const generatedAt = new Date().toISOString();
    write({
      status: "live",
      generatedAt,
      ...reviewMetadata(generatedAt),
      attribution: "Legislative data via LegiScan (CC BY 4.0).",
      items,
    });
    console.log(`LegiScan: wrote ${items.length} tracked bill(s).`);
  } catch (error) {
    console.warn("LegiScan pull failed (non-fatal); leaving existing file:", error);
  }
}

void main();
