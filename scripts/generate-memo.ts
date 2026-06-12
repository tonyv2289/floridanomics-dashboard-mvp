/**
 * Generate the "what changed" memo by diffing the current dataset against a
 * previous version (default: the copy committed at HEAD).
 *
 * Usage:
 *   tsx scripts/generate-memo.ts                 # diff HEAD vs working tree
 *   tsx scripts/generate-memo.ts --prev-ref <git-ref>
 *
 * Outputs:
 *   public/data/what-changed.json   structured payload for the dashboard
 *   docs/memos/<date>-what-changed.md  newsletter-ready markdown
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DashboardDataset } from "../src/types/dashboard";
import { buildPayload, renderMemoMarkdown } from "./lib/memo";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET_PATH = "public/data/florida-economy.json";
const JSON_OUT = join(ROOT, "public/data/what-changed.json");
const MEMO_DIR = join(ROOT, "docs/memos");
const SITE_URL = "https://tonyv2289.github.io/floridanomics-dashboard-mvp/";

function parsePrevRef(): string {
  const index = process.argv.indexOf("--prev-ref");
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "HEAD";
}

function loadPrevious(ref: string): DashboardDataset {
  const raw = execFileSync("git", ["show", `${ref}:${DATASET_PATH}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(raw) as DashboardDataset;
}

function main() {
  const prevRef = parsePrevRef();
  const prev = loadPrevious(prevRef);
  const next = JSON.parse(readFileSync(join(ROOT, DATASET_PATH), "utf8")) as DashboardDataset;

  const payload = buildPayload(prev, next);
  writeFileSync(JSON_OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`what-changed.json: ${payload.items.length} change(s), ${payload.prevPeriod} -> ${payload.period}`);

  if (payload.items.length === 0) {
    console.log("No changes detected; skipping markdown memo.");
    return;
  }

  mkdirSync(MEMO_DIR, { recursive: true });
  const memoPath = join(MEMO_DIR, `${payload.generatedAt.slice(0, 10)}-what-changed.md`);
  writeFileSync(memoPath, renderMemoMarkdown(payload, SITE_URL));
  console.log(`memo: ${memoPath}`);
}

main();
