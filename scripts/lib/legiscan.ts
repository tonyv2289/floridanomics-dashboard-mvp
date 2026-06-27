/**
 * LegiScan API client (Policy Alpha Memo module).
 * Activates when LEGISCAN_API_KEY is set; otherwise the pull is a graceful no-op.
 * Strategy: one getMasterList call per Florida session, filtered to a small watch-list,
 * which keeps usage far under the 30,000/month public-service limit. CC BY 4.0 attributed.
 */
const BASE = "https://api.legiscan.com/";

export type PolicyItem = {
  billId: number;
  number: string;
  title: string;
  status: string;
  lastAction: string;
  lastActionDate: string;
  url: string;
};

// LegiScan numeric status -> label.
const STATUS_LABEL: Record<number, string> = {
  1: "Introduced",
  2: "Engrossed",
  3: "Enrolled",
  4: "Passed",
  5: "Vetoed",
  6: "Failed",
};

type MasterListEntry = {
  bill_id: number;
  number: string;
  title: string;
  status: number;
  last_action: string;
  last_action_date: string;
  url: string;
};

async function call(apiKey: string, params: Record<string, string>): Promise<unknown> {
  const query = new URLSearchParams({ key: apiKey, ...params }).toString();
  const response = await fetch(`${BASE}?${query}`);
  if (!response.ok) {
    throw new Error(`LegiScan ${params.op} failed: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch the current Florida session master list and return the watch-listed bills.
 * billNumbers are matched case-insensitively against the bill "number" (e.g. "SB 484").
 */
export async function fetchFloridaWatchlist(apiKey: string, billNumbers: string[]): Promise<PolicyItem[]> {
  const wanted = new Set(billNumbers.map((n) => n.replace(/\s+/g, "").toUpperCase()));
  const result = (await call(apiKey, { op: "getMasterList", state: "FL" })) as {
    masterlist?: Record<string, MasterListEntry | { session?: unknown }>;
  };
  const masterlist = result.masterlist ?? {};
  const items: PolicyItem[] = [];

  for (const key of Object.keys(masterlist)) {
    const entry = masterlist[key] as MasterListEntry;
    if (!entry || typeof entry.bill_id !== "number" || !entry.number) {
      continue; // skip the "session" metadata entry
    }
    if (!wanted.has(entry.number.replace(/\s+/g, "").toUpperCase())) {
      continue;
    }
    items.push({
      billId: entry.bill_id,
      number: entry.number,
      title: entry.title,
      status: STATUS_LABEL[entry.status] ?? `Status ${entry.status}`,
      lastAction: entry.last_action,
      lastActionDate: entry.last_action_date,
      url: entry.url,
    });
  }

  return items;
}
