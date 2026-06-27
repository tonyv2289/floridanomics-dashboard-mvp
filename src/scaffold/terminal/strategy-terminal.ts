/**
 * SCAFFOLD - Epic 2: Strategy Terminal as its own surface + 5 modules.
 * Not wired into the live app. Data-contract types per module so we can see exactly
 * which feed each module is waiting on.
 *
 * Architecture decision: build the Terminal as a standalone lazy route beside the
 * dashboard tabs, organized by the 5-layer Growth Stack (People / Capital /
 * Infrastructure / Clusters / Policy). The forecast contract is frozen as the Florida
 * Brain export schema.
 *
 * Per-module HOLDUP (the gate is data acquisition, not UI):
 */

// Module 1 - AI Capex Gap Index (Infrastructure layer). The flagship thesis:
// "Florida is services-strong but capex-light" vs TX/GA on data-center MW.
// HOLDUP: a data-center capacity feed by state (planned + operational MW). No free
// clean API. Options: scrape/curate from Data Center Map / state PUC filings / press,
// or license a dataset. Needs a sourcing decision + a curation cadence.
export type AiCapexGapDatum = {
  state: string;
  operationalMw: number;
  plannedMw: number;
  powerQueueMw?: number;
  asOf: string;
  source: { label: string; url: string };
};

// Module 2 - High-Wage Jobs Monitor (People/Capital). HOLDUP: mostly UNBLOCKED.
// OEWS occupational wage data is available via WSER/BLS (we already pull labor data).
// Needs the OEWS occupation x wage cut wired through refresh-data.ts.
export type HighWageJobDatum = {
  occupation: string;
  socCode: string;
  medianWageUsd: number;
  employment: number;
  oneYearWageChangePct?: number;
  source: { label: string; url: string };
};

// Module 3 - Project Capex Ledger (Capital/Infrastructure). Tracks announced
// investments/projects (semiconductors, ports, shipbuilding, data centers).
// HOLDUP: a curated project-announcement feed. No single API. Options: a curated
// JSON the team maintains (SelectFlorida/eMerge already track some), or an enrichment
// source. Needs an owner + schema + cadence. Partially seedable from vault data.
export type CapexProjectDatum = {
  id: string;
  company: string;
  project: string;
  sector: string;
  region: string;
  capexUsd?: number;
  jobs?: number;
  announcedDate: string;
  status: "announced" | "under_construction" | "operational";
  source: { label: string; url: string };
};

// Module 4 - Policy Alpha Memo (Policy layer). Generate a memo on a tracked bill
// (SB 484 first). HOLDUP: a legislative tracking feed. FL Senate/House have data, and
// LegiScan offers a free API key. Needs the LegiScan key + a bill-watch list + an
// LLM memo template (we already render memos via generate-memo.ts patterns).
export type PolicyWatchItem = {
  billId: string;
  title: string;
  chamber: "senate" | "house";
  status: string;
  lastAction: string;
  lastActionDate: string;
  relevance: string;
  source: { label: string; url: string };
};

// Module 5 - Evidence Block Export (cross-cutting). HOLDUP: essentially UNBLOCKED.
// We already have the data + citations-master. This is a serializer that emits a
// cited evidence block (markdown/JSON) for any metric/claim, reusing the memo lib.
export type EvidenceBlock = {
  claim: string;
  metricId?: string;
  value: string;
  asOf: string;
  sources: Array<{ label: string; url: string }>;
};

export type StrategyTerminalData = {
  aiCapexGap: AiCapexGapDatum[];
  highWageJobs: HighWageJobDatum[];
  capexLedger: CapexProjectDatum[];
  policyWatch: PolicyWatchItem[];
};

/** Readiness summary, surfaced in the scaffold holdups doc. */
export const MODULE_READINESS = {
  aiCapexGap: { ready: false, blocker: "data-center MW feed by state" },
  highWageJobs: { ready: true, blocker: "wire OEWS cut through refresh (BLS/WSER, already available)" },
  capexLedger: { ready: false, blocker: "curated project-announcement feed + owner" },
  policyAlphaMemo: { ready: false, blocker: "LegiScan API key + bill-watch list" },
  evidenceExport: { ready: true, blocker: "none; reuse memo lib + citations-master" },
} as const;
