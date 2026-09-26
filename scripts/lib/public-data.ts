// Publication boundary. Reject private provenance; never silently strip citations
// and leave a claim looking publicly supported. Errors omit the rejected values.
const PRIVATE_KEYS = /^(vaultLog|macStudioPath|localPath|internalNotes?|privateNotes?|accessToken|refreshToken|password|secret|apiKey)$/i;
// Local home paths only: a public URL path such as example.gov/home/news is not private provenance.
const PRIVATE_TEXT = /(?:(?<![\w.%-])\/(?:Users|home)\/|[a-z]:\\Users\\|file:\/\/|pelayo-vault|Dropbox source|Vault derivative|vault_logged|Library\/CloudStorage|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

export function assertPublicText(value: string): void {
  if (PRIVATE_TEXT.test(value)) throw new Error("Publication blocked: private provenance or credential material detected.");
}

function exactKeys(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new Error("Publication blocked: unapproved competition field.");
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid public data object.");
  return value as Record<string, unknown>;
}

export function isPublicSourceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password
      && host.includes(".") && !/^[\d.]+$/.test(host) && !host.includes(":")
      && !/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
      && !/(?:^|\.)(?:dropbox\.com|dropboxusercontent\.com)$/.test(host);
  } catch { return false; }
}

export function assertPublicDataset(value: unknown): void {
  function walk(item: unknown): void {
    if (typeof item === "string") { assertPublicText(item); return; }
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (PRIVATE_KEYS.test(key)) throw new Error("Publication blocked: private metadata field detected.");
      assertPublicText(key);
      walk(child);
    }
  }
  walk(value);
  const competition = record(record(value).competition);
  exactKeys(competition, ["headline", "summary", "publicationNote", "sources", "metroComparison", "internationalMetroComparison", "fdiScoreboard", "stateInvestment"]);
  if (!Array.isArray(competition.sources) || !competition.sources.length) throw new Error("Public competition sources required.");
  const ids = new Set<string>();
  for (const item of competition.sources) {
    const source = record(item);
    exactKeys(source, ["id", "label", "url", "note"]);
    if (typeof source.id !== "string" || !source.id || ids.has(source.id) || !isPublicSourceUrl(source.url)) {
      throw new Error("Publication blocked: invalid or duplicate public source.");
    }
    ids.add(source.id);
  }
  function checkRefs(item: unknown): void {
    if (!item || typeof item !== "object") return;
    const object = item as Record<string, unknown>;
    if ("sourceIds" in object && (!Array.isArray(object.sourceIds) || !object.sourceIds.length
      || object.sourceIds.some((id) => typeof id !== "string" || !ids.has(id)))) {
      throw new Error("Publication blocked: claim lacks an approved public citation.");
    }
    for (const child of Object.values(object)) checkRefs(child);
  }
  checkRefs(competition);
  const scoreboard = record(competition.fdiScoreboard);
  exactKeys(scoreboard, ["headline", "summary", "observatory"]);
  const observatory = record(scoreboard.observatory);
  exactKeys(observatory, ["headline", "summary", "scores", "deltas"]);
  if ("stateInvestment" in competition) {
    // Tracker export: every block is keyed exactly and every claim cites an approved public source.
    const invest = record(competition.stateInvestment);
    exactKeys(invest, ["schemaVersion", "generatedOn", "evidenceCutoff", "headline", "summary", "peerStates", "measures", "dataCenters", "facilityHistory", "finalists", "method"]);
    if (!Array.isArray(invest.measures) || !invest.measures.length) throw new Error("Public state investment measures required.");
    for (const item of invest.measures) {
      const measure = record(item);
      exactKeys(measure, ["id", "label", "question", "period", "format", "florida", "reference", "states", "read", "caveat", "sourceIds"]);
      if (!Array.isArray(measure.sourceIds) || !measure.sourceIds.length) throw new Error("Publication blocked: claim lacks an approved public citation.");
    }
    const dataCenters = record(invest.dataCenters);
    exactKeys(dataCenters, ["headline", "facts", "caveat"]);
    for (const item of Array.isArray(dataCenters.facts) ? dataCenters.facts : []) {
      exactKeys(record(item), ["id", "label", "value", "read", "sourceIds"]);
    }
    exactKeys(record(invest.finalists), ["headline", "read", "caveat", "sourceIds"]);
    if ("facilityHistory" in invest) {
      const history = record(invest.facilityHistory);
      exactKeys(history, ["label", "question", "years", "states", "medianPerMillion", "medianProjects", "read", "caveat", "sourceIds"]);
      for (const item of Array.isArray(history.states) ? history.states : []) {
        exactKeys(record(item), ["state", "projects", "perMillion", "rankPerMillion", "rankProjects"]);
      }
    }
  }
}
