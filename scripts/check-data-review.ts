import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { assessFreshness } from "../src/lib/freshness";
import type { DashboardDataset } from "../src/types/dashboard";
import type { RegionalEconomy } from "../src/regions/geographies";
import type { ReleaseCalendar } from "../src/lib/release-calendar";
import { REGIONAL_PROFILES } from "../src/regions/profiles";
import { TJ_READ } from "../src/briefing/editorial";

const load = async <T,>(file: string) => JSON.parse(await readFile(file, "utf8")) as T;
const baseline = <T,>(file: string): T => JSON.parse(execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })) as T;
const data = await load<DashboardDataset>("public/data/florida-economy.json");
const regions = await load<RegionalEconomy>("public/data/regional-economy.json");
const calendar = await load<ReleaseCalendar>("public/data/release-calendar.json");
const now = new Date();

// Observation dates and content remain significant. Only retrieval/build stamps are ignored.
function semantic(value: unknown): string {
  return JSON.stringify(value, (key, item: unknown) => ["generatedAt", "refreshedAt", "retrievedAt", "checkedAt"].includes(key) ? undefined : item);
}

const changes: string[] = [];
const committed = baseline<DashboardDataset>("public/data/florida-economy.json");
const economicChanged = semantic(committed) !== semantic(data);
if (economicChanged) changes.push("The economic dataset has new observations, revisions or source changes awaiting review.");
let committedRegions = regions;
try { committedRegions = baseline<RegionalEconomy>("public/data/regional-economy.json"); } catch { /* Initial implementation before the first commit. */ }
const regionalChanged = semantic(committedRegions) !== semantic(regions);
if (regionalChanged) changes.push("County employment and wage benchmarks changed and await review.");
let committedCalendar = calendar;
try { committedCalendar = baseline<ReleaseCalendar>("public/data/release-calendar.json"); } catch { /* First implementation. */ }
const calendarChanged = semantic(committedCalendar) !== semantic(calendar);
if (calendarChanged) changes.push("The official release schedule changed; review the new dates before publishing the calendar.");
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `has_updates=${economicChanged || regionalChanged || calendarChanged}\n`);
const findings = assessFreshness(committed, committedRegions, calendar, now);
const errors = (process.env.REFRESH_FAILURES ?? "").split(",").filter(Boolean);
for (const error of errors) changes.push(`The ${error} check failed. The retained file is not a newly verified observation.`);
if ((now.getTime() - new Date(TJ_READ.publishedAt).getTime()) / 86400000 > 45) changes.push("TJ’s Read is more than 45 days old. Review the column separately; do not automatically rewrite or redate it.");
for (const profile of REGIONAL_PROFILES) if ((now.getTime() - new Date(profile.reviewedAt).getTime()) / 86400000 > 90) changes.push(`${profile.title}: institutional and project sources are due for a 90-day review.`);
const items = [...changes, ...findings.map((finding) => `${finding.label}: ${finding.detail}`)];
const actionable = items.length > 0;
const body = [
  "## Floridanomics data review",
  ...items.map((item) => `- ${item}`),
  ...(actionable ? [] : ["No stale series or material changes detected."]),
  "",
  "### Publication gate",
  "Review the dated sources, the data differences and any affected interpretation. Project announcements and TJ’s Read require separate editorial review. The scheduled check does not publish to the website or merge a branch.",
  "",
  "Review artifacts: https://github.com/tonyv2289/floridanomics-dashboard-mvp/actions/workflows/refresh-data.yml",
  "Dispatch Refresh Data with publish=true only to stage a checked branch. Review and merge through the normal protected-main process to publish.",
].join("\n");
await mkdir("docs/memos", { recursive: true });
await writeFile("docs/memos/update-review.md", `${body}\n`);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);
console.log(body);

if (process.argv.includes("--notify")) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !token) throw new Error("Missing scoped GitHub alert configuration");
  const title = "Floridanomics: data review needed";
  const api = async (path: string, method = "GET", payload?: unknown) => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`GitHub review alert HTTP ${response.status}`);
    return response.json();
  };
  // Inspect all pages before creating, so a busy issue list cannot cause duplicate alerts.
  let existing: { number: number; body: string } | undefined;
  for (let page = 1; ; page++) {
    const issues = await api(`issues?state=open&creator=github-actions%5Bbot%5D&per_page=100&page=${page}`) as Array<{ number: number; title: string; body: string; pull_request?: unknown }>;
    existing = issues.find((issue) => !issue.pull_request && issue.title === title);
    if (existing || issues.length < 100) break;
  }
  if (actionable && !existing) await api("issues", "POST", { title, body });
  else if (actionable && existing && existing.body !== body) await api(`issues/${existing.number}`, "PATCH", { body });
  else if (!actionable && existing) await api(`issues/${existing.number}`, "PATCH", { state: "closed", state_reason: "completed" });
  console.log("Review alert reconciled; unchanged state does not create another issue or comment.");
}
